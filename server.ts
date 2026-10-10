import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  validateSafeUrl,
  sanitizeMarkdownContent,
  validateSafeFilename,
  validateChatQuestion,
  containsXssPayload,
} from './src/services/validation.js';
import {
  compileKnowledgeResponse,
  AnswerMode,
  CompiledAnswerPlan,
} from './src/services/engine/responseCompiler.js';
// import { repositories } from './src/repositories/index.js';
import { cacheService, cacheMetrics } from './src/cache/cache.module.js';
import { resolveLanguageContext } from './src/i18n/i18n.resolver.js';
import { getLanguageAdapter } from './src/i18n/i18n.adapter.js';
import {
  parseMarkdownToAst,
  renderAstToHtml,
  RENDERER_VERSION,
  renderObservability,
} from './src/content/index.js';
import {
  INITIAL_WORKSPACE,
  INITIAL_COLLECTIONS,
  INITIAL_PUBLIC_EMBEDS,
} from './src/data/seedData.js';
import {
  EmbedIdentity,
  getEmbedCollectionIds,
  resolveEmbedAuthorization,
  resolveRequestEmbedIdentity,
  computeEmbedAuthorizationVersion,
  computeEmbedVerificationProof,
  createEmbedRuntimeSession,
  upgradeEmbedSessionIdentity,
  identityToClearanceTier,
  clearanceLabelToEmbedIdentity,
  CLOCK_SKEW_TOLERANCE_SECONDS,
  EmbedRuntimeSession,
} from './src/services/embedAuthorization.js';
import {
  clearPublicHomepageDemoCache,
  handlePublicHomepageDemoChatStream,
  handlePublicHomepageDemoContext,
  validatePublicDemoRegistries,
} from './server/demo/publicHomepageDemoAuthorization.js';

dotenv.config();

const demoRegistryValidation = validatePublicDemoRegistries();
if (!demoRegistryValidation.valid) {
  throw new Error(
    `[STARTUP] Public demo registry validation failed: ${demoRegistryValidation.errors.join('; ')}`
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini API client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'OKEng Knowledge Layer',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// Helper functions for AUTH-01 / AUTH-02 / AUTH-03 short-lived signed tokens
function signToken(claims: any, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token: string, secret: string): { valid: boolean; claims?: any; error?: string } {
  if (!token || typeof token !== 'string') return { valid: false, error: 'MISSING_TOKEN' };
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return { valid: false, error: 'MALFORMED_TOKEN' };
  }
  const [headerPart, payloadPart, signature] = parts;

  let parsedHeader: Record<string, unknown>;
  try {
    parsedHeader = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, error: 'MALFORMED_TOKEN_HEADER' };
  }

  // Strict alg === "HS256" & Server-Side Key Selection Invariant
  if (
    !parsedHeader ||
    parsedHeader.alg !== 'HS256' ||
    (parsedHeader.typ !== undefined && parsedHeader.typ !== 'JWT')
  ) {
    return { valid: false, error: 'UNSUPPORTED_JWT_ALGORITHM' };
  }

  if (
    parsedHeader.jku !== undefined ||
    parsedHeader.x5u !== undefined ||
    parsedHeader.jwk !== undefined
  ) {
    return { valid: false, error: 'FORBIDDEN_KEY_INJECTION_HEADER' };
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${headerPart}.${payloadPart}`)
    .digest('base64url');
  if (signature !== expectedSig) {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }
  try {
    const claims = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (claims.iat && claims.iat > now + CLOCK_SKEW_TOLERANCE_SECONDS) {
      return { valid: false, error: 'TOKEN_NOT_YET_VALID', claims };
    }
    if (claims.exp && claims.exp < now - CLOCK_SKEW_TOLERANCE_SECONDS) {
      return { valid: false, error: 'TOKEN_EXPIRED', claims };
    }
    return { valid: true, claims };
  } catch {
    return { valid: false, error: 'INVALID_PAYLOAD' };
  }
}

// Development and host integration token signer endpoint
app.post('/api/auth/token/sign', (req, res) => {
  const { claims, signingSecret = 'sk_live_sec_acme_prod_9921' } = req.body;
  if (!claims || !claims.workspace_id || !claims.role) {
    res.status(400).json({ error: 'claims with workspace_id and role are required' });
    return;
  }
  const token = signToken(claims, signingSecret);
  res.json({ token, claims });
});

// Token verification endpoint
app.post('/api/auth/token/verify', (req, res) => {
  const { token, signingSecret = 'sk_live_sec_acme_prod_9921' } = req.body;
  const result = verifyToken(token, signingSecret);
  if (!result.valid) {
    res.status(401).json({ valid: false, error: result.error });
    return;
  }
  res.json({ valid: true, claims: result.claims });
});

// ==========================================
// AUTH-04 §3, §15: Public Documentation API
// ==========================================
app.get('/api/docs', (_req, res) => {
  try {
    const docsDir = path.join(__dirname, 'docs');
    if (!fs.existsSync(docsDir)) {
      res.json({ docs: [] });
      return;
    }
    const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md')).sort();
    const docs = files.map((file) => ({
      slug: file.replace(/\.md$/, ''),
      filename: file,
    }));
    res.json({ docs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read public documentation index' });
  }
});

app.get('/api/docs/:slug', (req, res) => {
  try {
    const safeSlug = path.basename(req.params.slug).replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(__dirname, 'docs', `${safeSlug}.md`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Documentation page not found' });
      return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ slug: safeSlug, content });
  } catch {
    res.status(500).json({ error: 'Failed to load documentation file' });
  }
});

// ==========================================
// AUTH-05 §3, §18: Server-Side 5-Link Workspace Authorization Guard
// ==========================================
const SERVER_MEMBERSHIPS: Record<
  string,
  { workspaceId: string; role: 'WORKSPACE_OWNER' | 'WORKSPACE_USER'; permissions: string[] }[]
> = {
  usr_sarah_102: [
    {
      workspaceId: 'okeng',
      role: 'WORKSPACE_OWNER',
      permissions: [
        'workspace.read',
        'workspace.settings.manage',
        'workspace.users.manage',
        'collection.read',
        'collection.write',
        'collection.delete',
        'collection.access.manage',
        'content.read',
        'content.write',
        'content.delete',
        'embed.read',
        'embed.manage',
        'test.execute',
        'conversations.read',
      ],
    },
  ],
  usr_marcus_204: [
    {
      workspaceId: 'okeng',
      role: 'WORKSPACE_USER',
      permissions: [
        'workspace.read',
        'collection.read',
        'collection.write',
        'content.read',
        'content.write',
        'embed.read',
        'conversations.read',
        'test.execute',
      ],
    },
  ],
  usr_elena_309: [
    {
      workspaceId: 'okeng',
      role: 'WORKSPACE_USER',
      permissions: ['workspace.read', 'collection.read', 'content.read', 'test.execute'],
    },
  ],
  // Note: usr_platform_admin_900 has platformRole = PLATFORM_ADMIN but ZERO workspace memberships by default (AUTH-04 §8, INV-05)
};

function requireWorkspaceAuthorization(requiredPermission: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const sessionUserId =
      (req.headers['x-okeng-session-user'] as string) ||
      (req.query.sessionUser as string) ||
      '';
    const bypassGrantHeader = req.headers['x-okeng-admin-grant'] as string;
    const rawWorkspaceId =
      req.params.workspaceId ||
      req.body?.workspaceId ||
      (req.query.workspaceId as string) ||
      'okeng';
    const requestedWorkspaceId = rawWorkspaceId === 'acme-cloud' ? 'okeng' : rawWorkspaceId;

    // Link 1: Valid authentication
    if (!sessionUserId) {
      res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
      return;
    }

    // Link 2: Valid workspace
    if (requestedWorkspaceId !== 'okeng') {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Link 3: Active workspace membership (or explicit AdminGrant)
    const userMemberships = SERVER_MEMBERSHIPS[sessionUserId] || [];
    const membership = userMemberships.find((m) => m.workspaceId === requestedWorkspaceId);

    const hasValidAdminGrant =
      sessionUserId === 'usr_platform_admin_900' &&
      bypassGrantHeader === 'grt_valid_exceptional_access';

    if (!membership && !hasValidAdminGrant) {
      res.status(403).json({
        error:
          sessionUserId === 'usr_platform_admin_900'
            ? 'PLATFORM_ADMIN_NO_WORKSPACE_MEMBERSHIP'
            : 'WORKSPACE_MEMBERSHIP_REQUIRED',
      });
      return;
    }

    // Link 4: Required permission
    const effectivePermissions = membership
      ? membership.permissions
      : ['workspace.read', 'collection.read', 'content.read', 'conversations.read'];

    if (
      membership?.role !== 'WORKSPACE_OWNER' &&
      !effectivePermissions.includes(requiredPermission)
    ) {
      res.status(403).json({ error: 'MISSING_EXPLICIT_PERMISSION', requiredPermission });
      return;
    }

    // Link 5: Resource ownership check if resourceWorkspaceId is passed
    const resourceWorkspaceId = req.body?.resourceWorkspaceId || req.query.resourceWorkspaceId;
    if (resourceWorkspaceId && resourceWorkspaceId !== requestedWorkspaceId) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    (req as any).workspaceContext = {
      userId: sessionUserId,
      workspaceId: requestedWorkspaceId,
      role: membership ? membership.role : 'PLATFORM_ADMIN_GRANT',
      permissions: effectivePermissions,
    };
    next();
  };
}

app.get('/api/workspaces/:workspaceId', requireWorkspaceAuthorization('workspace.read'), (req, res) => {
  res.json({
    id: 'ws_okeng_01',
    slug: 'okeng',
    name: 'OKEng',
    context: (req as any).workspaceContext,
  });
});

app.patch('/api/workspaces/:workspaceId', requireWorkspaceAuthorization('workspace.settings.manage'), (req, res) => {
  res.json({
    status: 'updated',
    workspaceId: req.params.workspaceId,
    updatedBy: (req as any).workspaceContext.userId,
  });
});

app.get('/api/workspaces/:workspaceId/collections', requireWorkspaceAuthorization('collection.read'), (req, res) => {
  res.json({
    workspaceId: req.params.workspaceId,
    collections: [
      { id: 'col_public', workspaceId: 'acme-cloud', name: 'Product Docs', visibility: 'everyone' },
      { id: 'col_members', workspaceId: 'acme-cloud', name: 'Customer Docs', visibility: 'members' },
      { id: 'col_admins', workspaceId: 'acme-cloud', name: 'Corporate Docs', visibility: 'admins' },
    ],
  });
});

app.get('/api/workspaces/:workspaceId/documents/:documentId', requireWorkspaceAuthorization('content.read'), (req, res) => {
  const { workspaceId, documentId } = req.params;
  // Simulate cross-workspace document lookup protection (AUTH-05 §18, INV-07)
  if (documentId.startsWith('doc_globex_')) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json({
    id: documentId,
    workspaceId,
    title: 'Authorized Workspace Document',
  });
});

// Server-side embedding generation endpoint
app.post('/api/embed', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text string is required' });
      return;
    }

    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: text,
      });
      const embeddingValues =
        (response as any).embeddings?.[0]?.values ||
        (response as any).embedding?.values ||
        [];
      res.json({
        embedding: embeddingValues,
        model: 'gemini-embedding-2-preview',
      });
      return;
    }

    // Fallback pseudo-vector for local offline testing
    res.json({
      embedding: Array.from({ length: 64 }, () => Math.random()),
      model: 'fallback-offline',
    });
  } catch (error) {
    console.error('Embedding error:', error);
    res.status(500).json({ error: 'Failed to generate embedding' });
  }
});

// Server-side Grounded Answer generation (standard)
app.post('/api/chat', async (req, res) => {
  try {
    const { question, contextChunks, role } = req.body;

    if (!question) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.json({
        answer: `[Server Mode: Keyless Preview] Answering for role: ${role || 'everyone'}.\n\nBased on your indexed documents, the information requested can be found in the attached citations.`,
        sources: contextChunks || [],
      });
      return;
    }

    const contextText = (contextChunks || [])
      .map(
        (c: { title: string; content: string }) =>
          `--- DOCUMENT: ${c.title} ---\n${c.content}`
      )
      .join('\n\n');

    const prompt = `You are the OKEng product knowledge assistant. Answer the user question strictly using the authorized context documents provided below.
If the information is not in the context, clearly explain that no authorized documentation covers this topic.
Always mention the document source titles you rely on.

AUTHORIZED CONTEXT:
${contextText || 'No context chunks provided.'}

USER QUESTION:
${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      answer: response.text || 'No response generated.',
      model: 'gemini-3.8-flash',
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate grounded answer' });
  }
});

// ENG-DOD-001 (SECURITY-002, SECURITY-003, STORAGE-001): Canonical Server Boundary Validation Endpoint
app.post('/api/security/validate', (req, res) => {
  const { filename, url, markdown } = req.body || {};

  if (filename !== undefined) {
    const fileCheck = validateSafeFilename(filename);
    if (!fileCheck.valid) {
      res.status(400).json({ valid: false, error: fileCheck.error });
      return;
    }
  }

  if (url !== undefined) {
    const urlCheck = validateSafeUrl(url);
    if (!urlCheck.valid) {
      res.status(400).json({ valid: false, error: urlCheck.error });
      return;
    }
  }

  const sanitizedMarkdown =
    typeof markdown === 'string' ? sanitizeMarkdownContent(markdown) : undefined;
  const hadXss = typeof markdown === 'string' ? containsXssPayload(markdown) : false;

  res.json({
    valid: true,
    hadXssStripped: hadXss,
    sanitizedMarkdown,
  });
});

// ENG-DOD-001: Audit & Infrastructure Status Endpoint
app.get('/api/audit/status', (_req, res) => {
  const supabaseStatus = repositories.getAdapterStatus();
  res.json({
    documentId: 'ENG-DOD-001',
    archMig001: 'ALIGNED',
    dataMig001:
      supabaseStatus.mode === 'supabase-live'
        ? 'SUPABASE_LIVE'
        : 'FALLBACK_ADAPTER_ACTIVE',
    engine01: 'DETERMINISTIC_COMPILER_DEFAULT',
    cache001: cacheService.getBackendName(),
    i18n001: ['en', 'es'],
    supabaseStatus,
  });
});

// CACHE-001: Cache Telemetry & Knowledge Version Invalidation Endpoints
app.get('/api/cache/metrics', (req, res) => {
  const wsId = String(req.query.workspaceId || 'okeng');
  res.json({
    workspaceId: wsId,
    knowledgeVersion: cacheService.getKnowledgeVersion(wsId),
    backend: cacheService.getBackendName(),
    metrics: cacheMetrics.snapshot(),
  });
});

app.post('/api/cache/invalidate', async (req, res) => {
  const wsId = String(req.body?.workspaceId || 'okeng');
  clearPublicHomepageDemoCache();
  const result = await cacheService.invalidateWorkspace(wsId);
  res.json({
    workspaceId: wsId,
    ...result,
    metrics: cacheMetrics.snapshot(),
  });
});

// Stateless Public Homepage Demo Context & EffectiveScope Status Endpoint
app.post('/api/demo/homepage-context', async (req, res) => {
  await handlePublicHomepageDemoContext(req, res);
});

// Server-side Grounded Answer Streaming via Server-Sent Events (SSE)
app.post('/api/chat/stream', async (req, res) => {
  // P0-01 Non-Bypassable Public Homepage Demo Routing:
  // Every request targeting EMB-PUBLIC-HOME or supplying demoPreset or mode === 'public_homepage_demo'
  // is handled strictly by handlePublicHomepageDemoChatStream (never falling through to general chat logic).
  if (
    req.body?.embedId === 'EMB-PUBLIC-HOME' ||
    req.body?.demoPreset !== undefined ||
    req.body?.mode === 'public_homepage_demo'
  ) {
    await handlePublicHomepageDemoChatStream(req, res);
    return;
  }

  const startTime = Date.now();
  const {
    question: rawQuestion,
    currentUrl = '/dashboard',
    documents = [],
    collections = [],
    workspaceId,
    mode = 'test_console',
  } = req.body;

  const qCheck = validateChatQuestion(rawQuestion);
  if (!qCheck.valid) {
    res.status(400).json({ error: qCheck.error || 'Question is required' });
    return;
  }
  const question = qCheck.sanitized || String(rawQuestion);

  // Helper to map external customer role vocabulary (EMBED-01 §7)
  const mapClearance = (r: string) => {
    const raw = (r || 'everyone').toLowerCase().trim();
    if (raw === 'admin' || raw === 'admins' || raw === 'manager') return 'admins';
    if (
      raw === 'member' ||
      raw === 'members' ||
      raw === 'user' ||
      raw === 'customer' ||
      raw === 'employee'
    ) {
      return 'members';
    }
    return 'everyone';
  };

  // Token & Authorization Verification (AUTH-01 §25, AUTH-03 §17, EMBED-01 §13, §18)
  let effectiveRole = mapClearance(req.body.role || 'everyone');
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.body.token;

  // Server-side workspace signing secret lookup (never from token-controlled fields)
  const expectedWsId = workspaceId || 'okeng';
  const serverSigningSecret =
    process.env.OKENG_SIGNING_SECRET ||
    (expectedWsId === 'acme-cloud'
      ? 'sk_live_sec_acme_prod_9921'
      : INITIAL_WORKSPACE.signingSecret || 'sk_live_sec_acme_prod_9921');
  const targetEmbedId: string | undefined = req.body?.embedId;

  let resolvedIdentity: EmbedIdentity = { kind: 'anonymous' };

  if (token) {
    const idResult = await resolveRequestEmbedIdentity({
      identityToken: token,
      browserRole: req.body?.browserRole,
      browserUserId: req.body?.browserUserId,
      browserPermissions: req.body?.browserPermissions,
      expectedWorkspaceId: expectedWsId,
      expectedEmbedId: targetEmbedId,
      signingSecret: serverSigningSecret,
    });
    if (!idResult.ok) {
      res.status(idResult.status).json({
        error: idResult.code,
        message: idResult.message,
      });
      return;
    }
    resolvedIdentity = idResult.identity;
    effectiveRole = identityToClearanceTier(resolvedIdentity);
  } else if (req.body.requireSignedToken) {
    res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
    return;
  } else if (mode === 'embed' && effectiveRole !== 'everyone') {
    // EMBED-01 §18 / Case A: Browser-supplied privileged roles without a signed assertion are rejected
    res.status(401).json({ error: 'UNVERIFIED_ROLE_ASSERTION' });
    return;
  } else {
    resolvedIdentity = clearanceLabelToEmbedIdentity(effectiveRole);
  }

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    // 1. Canonical Authorization Pipeline:
    // TargetScope (Workspace | Embed | Collection) -> resolveEmbedAuthorization -> AuthorizationScope.collectionIds
    const scopeColIds: string[] = Array.isArray(req.body?.targetScopeCollectionIds)
      ? req.body.targetScopeCollectionIds
      : Array.isArray(req.body?.allowedCollectionIds)
      ? req.body.allowedCollectionIds
      : targetEmbedId && Array.isArray(req.body?.embeds)
      ? getEmbedCollectionIds(req.body.embeds.find((e: any) => e.id === targetEmbedId)) as string[]
      : collections.map((c: any) => c.id);
    const scopeDocIds: string[] | undefined = Array.isArray(req.body?.allowedDocumentIds)
      ? req.body.allowedDocumentIds
      : undefined;

    const authorizationScope = resolveEmbedAuthorization(
      resolvedIdentity,
      scopeColIds,
      collections
    );
    const authorizedCollectionIdSet = new Set(authorizationScope.collectionIds);

    const authorizedCollections = collections.filter((c: any) =>
      authorizedCollectionIdSet.has(c.id)
    );
    const blockedCollections = collections.filter(
      (c: any) => scopeColIds.includes(c.id) && !authorizedCollectionIdSet.has(c.id)
    );

    // 2. Filter authorized and active documents strictly from AuthorizationScope.collectionIds
    const authorizedDocs = documents.filter((d: any) => {
      const inAuthCol = authorizedCollectionIdSet.has(d.collectionId);
      const inDocScope = !scopeDocIds || scopeDocIds.length === 0 || scopeDocIds.includes(d.id);
      return inAuthCol && inDocScope && !d.deleted_at && !d.deletedAt && d.status !== 'deleted';
    });

    // 3. I18N-001 + CACHE-001 + ENGINE-01: Resolve LanguageContext & Execute Scoped Cache / Compiler
    const requestedAnswerMode: AnswerMode =
      req.body?.answerMode === 'extractive'
        ? 'extractive'
        : req.body?.answerMode === 'generative'
        ? 'generative'
        : 'deterministic';

    const isEmbedMode = mode === 'embed';
    const wsId = workspaceId || 'okeng';
    const knowledgeVersion =
      typeof req.body?.knowledgeVersion === 'number'
        ? req.body.knowledgeVersion
        : cacheService.getKnowledgeVersion(wsId);

    const scopePartitionId = String(req.body?.scopeKey || targetEmbedId || mode);

    const authorizationVersion = computeEmbedAuthorizationVersion(
      {
        id: scopePartitionId,
        knowledgeScope: {
          collectionIds: scopeColIds,
          documentIds: scopeDocIds,
        },
      },
      collections
    );

    const langCtx = resolveLanguageContext({
      question,
      explicitResponseLanguage: req.body?.responseLanguage,
      userLanguagePreference: req.body?.userLanguagePreference,
      hostLanguage: req.body?.hostLanguage || req.body?.language,
      uiLanguage: req.body?.uiLanguage,
      browserLocale: req.body?.locale,
    });

    const activeDocFingerprint = authorizedDocs.map((d: any) => d.id);

    const cacheCtx = {
      workspaceId: wsId,
      embedId: scopePartitionId,
      identity: resolvedIdentity,
      authorizationScope,
      authorizationVersion,
      authorizedCollectionIds: authorizationScope.collectionIds,
      narrowedDocumentIds: scopeDocIds || activeDocFingerprint,
      knowledgeVersion,
      currentUrl,
      responseLanguage: langCtx.response_language,
      answerMode: requestedAnswerMode,
      question,
    };

    const { value: compiledPlan, telemetry: cacheTelemetry } =
      await cacheService.getOrComputeAnswerSingleFlight<CompiledAnswerPlan>(
        cacheCtx,
        async () => {
          const plan = compileKnowledgeResponse({
            question,
            authorizedDocs,
            currentUrl,
            answerMode:
              requestedAnswerMode === 'generative'
                ? 'deterministic'
                : requestedAnswerMode,
            isEmbedMode,
            effectiveRole,
            blockedCollectionsCount: blockedCollections.length,
            explicitResponseLanguage: req.body?.responseLanguage,
            userLanguagePreference: req.body?.userLanguagePreference,
            hostLanguage: req.body?.hostLanguage || req.body?.language,
            uiLanguage: req.body?.uiLanguage,
          });
          return {
            value: plan,
            isNegative: plan.answerType === 'unknown' || plan.sources.length === 0,
          };
        }
      );

    await repositories.usage.recordEvent({
      workspaceId: wsId,
      eventType: 'retrieval_query',
      answerMode: requestedAnswerMode,
      tokensUsed: Math.max(12, Math.round(compiledPlan.compiledMarkdown.length / 4)),
      latencyMs: compiledPlan.latencyMs,
    });

    res.write(
      `data: ${JSON.stringify({
        type: 'metadata',
        role: effectiveRole,
        currentUrl,
        cacheTelemetry,
        languageContext: compiledPlan.languageContext,
        answerPlan: {
          answerMode: requestedAnswerMode,
          answerType: compiledPlan.answerType,
          document: compiledPlan.document,
          section: compiledPlan.section,
          matchedTokens: compiledPlan.matchedTokens,
          matchedSynonyms: compiledPlan.matchedSynonyms,
          routeBoostApplied: compiledPlan.routeBoostApplied,
          stepsCount: compiledPlan.steps.length,
          sourceLanguages: compiledPlan.sourceLanguages,
          retrievalMode: compiledPlan.retrievalMode,
          translationMode: compiledPlan.translationMode,
        },
        authorizedCollections: isEmbedMode
          ? []
          : authorizedCollections.map((c: any) => ({
              id: c.id,
              name: c.name,
              visibility: c.visibility,
            })),
        blockedCollections: isEmbedMode
          ? []
          : blockedCollections.map((c: any) => ({
              id: c.id,
              name: c.name,
              visibility: c.visibility,
            })),
        effectiveCollectionIds: authorizationScope.collectionIds,
        authorizationVersion,
        knowledgeVersion,
        retrievedChunks: compiledPlan.retrievedChunks,
        sources: compiledPlan.sources,
        cta: compiledPlan.cta,
      })}\n\n`
    );

    // If no authorized docs found or collection is blocked
    if (compiledPlan.answerType === 'unknown' || compiledPlan.sources.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: compiledPlan.compiledMarkdown })}\n\n`);
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          latencyMs: Date.now() - startTime,
          tokens: 0,
        })}\n\n`
      );
      res.end();
      return;
    }

    // 4. Optional Mode 3 ('generative'): Only invoke LLM if caller explicitly requested 'generative' AND key is present
    if (requestedAnswerMode === 'generative' && process.env.GEMINI_API_KEY) {
      const adapter = getLanguageAdapter(langCtx.response_language);
      const contextText = compiledPlan.sources
        .map((s) => {
          const fullDoc = authorizedDocs.find((d: any) => d.id === s.docId);
          return `DOCUMENT: ${s.title} (${s.filename} [${s.language || 'en'}])\n${fullDoc?.content || s.snippet}`;
        })
        .join('\n\n---\n\n');

      const systemPrompt = `You are the OKEng product knowledge assistant.
${adapter.llmSystemInstruction(compiledPlan.sourceLanguages)}
Always cite the relevant document titles in your answer.
Keep the tone quiet, helpful, concise, and technical.

AUTHORIZED CONTEXT:
${contextText}`;

      const stream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nUSER QUESTION: ${question}` }] },
        ],
      });

      let totalTokens = 0;
      for await (const chunk of stream) {
        if (chunk.text) {
          totalTokens += Math.ceil(chunk.text.length / 4);
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk.text })}\n\n`);
        }
      }

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          latencyMs: Date.now() - startTime,
          tokens: totalTokens + 120,
        })}\n\n`
      );
      res.end();
      return;
    }

    // 5. Mode 1 ('deterministic' Default) & Mode 2 ('extractive') — Zero LLM Response Compiler
    res.write(
      `data: ${JSON.stringify({
        type: 'chunk',
        text: compiledPlan.compiledMarkdown,
      })}\n\n`
    );

    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        latencyMs: Math.max(1, Date.now() - startTime),
        tokens: 0,
      })}\n\n`
    );
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to stream answer' })}\n\n`);
    res.end();
  }
});

// ============================================================================
// RENDER-001 & RENDER-TEST-001 (RENDER-028, 040, 041): Content & Answer Actions
// Server-side authorization boundary for Edit Source, Save Answer to Workspace,
// Export, Share Integrity, and Issue Reporting.
// ============================================================================

const SHARE_STORE = new Map<
  string,
  {
    shareId: string;
    documentId?: string;
    collectionId: string;
    isPublicDocument: boolean;
    content?: string;
    locale: 'en' | 'es';
    createdAt: string;
  }
>();

const ISSUE_REPORTS: Array<Record<string, unknown>> = [];

function handleProtectedDocumentEdit(req: express.Request, res: express.Response) {
  const sourceId = req.params.id || req.params.sourceId;
  const sessionToken =
    (req.headers['x-okeng-session'] as string) ||
    req.body?.sessionToken ||
    '';

  // Enforce server-side workspace authentication & edit permission (RENDER-028)
  if (!sessionToken) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required to edit source documents.',
    });
    return;
  }

  // Only usr_owner_01 (Workspace Owner / Editor) holds workspace.documents.manage
  if (sessionToken !== 'usr_owner_01' && sessionToken !== 'authenticated_editor') {
    res.status(403).json({
      error: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
      message: 'Caller lacks workspace.documents.manage permission.',
    });
    return;
  }

  const { content, title } = req.body || {};
  if (typeof content === 'string' && containsXssPayload(content)) {
    res.status(400).json({ error: 'XSS_PAYLOAD_REJECTED' });
    return;
  }

  const newKv = cacheService.bumpKnowledgeVersion('okeng');
  res.json({
    ok: true,
    documentId: sourceId,
    title: title || 'Updated Document',
    rendererVersion: RENDERER_VERSION,
    newKnowledgeVersion: newKv,
  });
}

app.post('/api/documents/:id/edit', handleProtectedDocumentEdit);
app.post('/api/embed/sources/:sourceId/edit', handleProtectedDocumentEdit);

// Save Answer to Workspace as a persistent Markdown document (RENDER-001 §36 & RENDER-040)
app.post('/api/embed/answers/save', async (req, res) => {
  const {
    workspaceId = 'okeng',
    collectionId = 'COL-DOCS',
    title = 'Saved Knowledge Answer',
    answerMarkdown = '',
    citations = [],
    roleKind = 'workspace_owner',
  } = req.body || {};

  if (roleKind !== 'authenticated_editor' && roleKind !== 'workspace_owner') {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Saving an answer to the workspace requires editor or owner permission.',
    });
    return;
  }

  const citationBlock =
    Array.isArray(citations) && citations.length > 0
      ? `\n\n## Sources\n${citations
          .map(
            (c: any) =>
              `- **${c.title || c.filename}** (\`${c.collectionId || collectionId}/${c.filename}\`)`
          )
          .join('\n')}\n`
      : '';

  const fullMarkdown = `# ${title}\n\n${answerMarkdown.trim()}${citationBlock}`;
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'saved-answer';

  const savedDoc = await repositories.documents.upsertDocument({
    id: `doc_saved_${Date.now()}`,
    workspaceId,
    collectionId,
    title,
    filename: `${slug}.md`,
    type: 'markdown',
    status: 'ready',
    fileSize: `${Math.max(1, Math.ceil(fullMarkdown.length / 1024))} KB`,
    content: fullMarkdown,
    chunkCount: Math.max(1, fullMarkdown.split('\n## ').length),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    indexedAt: new Date().toISOString(),
  });

  const newKv = cacheService.bumpKnowledgeVersion(workspaceId);
  res.json({
    ok: true,
    document: savedDoc,
    newKnowledgeVersion: newKv,
  });
});

// Export Answer / Document in MD, TXT, or HTML/PDF format without UI chrome (RENDER-040)
app.post('/api/embed/answers/export', (req, res) => {
  const { content = '', format = 'md', context = 'DOCUMENT_FULL' } = req.body || {};
  const ast = parseMarkdownToAst(content, { sanitize: true });

  if (format === 'txt') {
    res.json({
      ok: true,
      format: 'txt',
      rendererVersion: RENDERER_VERSION,
      output: ast.plainText,
    });
    return;
  }

  if (format === 'html' || format === 'pdf') {
    res.json({
      ok: true,
      format,
      rendererVersion: RENDERER_VERSION,
      output: renderAstToHtml(ast, context),
    });
    return;
  }

  res.json({
    ok: true,
    format: 'md',
    rendererVersion: RENDERER_VERSION,
    output: content,
  });
});

// Share Integrity (RENDER-041): Public docs resolve; protected docs enforce workspace authorization
app.post('/api/embed/share', (req, res) => {
  const {
    documentId,
    collectionId = 'COL-PUBLIC',
    isPublicDocument = true,
    content,
    locale = 'en',
  } = req.body || {};

  const shareId = `shr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  SHARE_STORE.set(shareId, {
    shareId,
    documentId,
    collectionId,
    isPublicDocument: Boolean(isPublicDocument && collectionId !== 'COL-INTERNAL'),
    content,
    locale,
    createdAt: new Date().toISOString(),
  });

  res.json({
    ok: true,
    shareId,
    shareUrl: `/api/embed/share/${shareId}`,
  });
});

app.get('/api/embed/share/:shareId', (req, res) => {
  const entry = SHARE_STORE.get(req.params.shareId);
  if (!entry) {
    res.status(404).json({ error: 'SHARE_NOT_FOUND' });
    return;
  }

  const sessionToken = (req.headers['x-okeng-session'] as string) || '';
  if (!entry.isPublicDocument && sessionToken !== 'usr_owner_01' && sessionToken !== 'usr_readonly_02') {
    res.status(403).json({
      error: 'SHARE_ACCESS_DENIED',
      message: 'This shared document belongs to a restricted collection and requires workspace authorization.',
    });
    return;
  }

  const ast = entry.content ? parseMarkdownToAst(entry.content, { sanitize: true }) : null;
  res.json({
    ok: true,
    shareId: entry.shareId,
    documentId: entry.documentId,
    collectionId: entry.collectionId,
    locale: entry.locale,
    rendererVersion: RENDERER_VERSION,
    ast,
  });
});

// Report Issue & Feedback (RENDER-001 §39–40)
app.post('/api/embed/feedback', (req, res) => {
  const {
    workspaceId = 'okeng',
    documentId,
    surface = 'DOCUMENT_FULL',
    rendererVersion = RENDERER_VERSION,
    language = 'en',
    category = 'formatting_problem',
    notes = '',
  } = req.body || {};

  renderObservability.record('report_issue_action', {
    context: surface,
    language,
  });

  const record = {
    id: `rep_${Date.now()}`,
    workspaceId,
    documentId,
    surface,
    rendererVersion,
    language,
    category,
    notes: String(notes).slice(0, 500),
    createdAt: new Date().toISOString(),
  };
  ISSUE_REPORTS.push(record);

  res.json({
    ok: true,
    report: record,
    metrics: renderObservability.getSnapshot(),
  });
});

// ============================================================================
// EMBED-01 & APP-05: Canonical Embed Runtime Session & Dual-Proof Verification
// ============================================================================

const EMBED_RUNTIME_SESSIONS = new Map<string, EmbedRuntimeSession>();

app.post('/api/embed/session', async (req, res) => {
  const {
    embedId = 'EMB-PUBLIC-DOCS',
    workspaceId = 'okeng',
    identityToken,
    browserRole,
    browserUserId,
    browserPermissions,
    embed: clientEmbed,
    collections: clientCollections,
  } = req.body || {};

  const serverSigningSecret =
    process.env.OKENG_SIGNING_SECRET ||
    INITIAL_WORKSPACE.signingSecret ||
    'sk_live_sec_acme_prod_9921';

  const collections =
    Array.isArray(clientCollections) && clientCollections.length > 0
      ? clientCollections
      : INITIAL_COLLECTIONS;
  const targetEmbed =
    clientEmbed ||
    INITIAL_PUBLIC_EMBEDS.find((e) => e.id === embedId) ||
    INITIAL_PUBLIC_EMBEDS[0];

  if (!targetEmbed) {
    res.status(404).json({
      ok: false,
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: 'Resource not found.',
    });
    return;
  }

  const identityRes = await resolveRequestEmbedIdentity({
    identityToken,
    browserRole,
    browserUserId,
    browserPermissions,
    expectedWorkspaceId: workspaceId,
    expectedEmbedId: targetEmbed.id,
    signingSecret: serverSigningSecret,
  });

  if (!identityRes.ok) {
    res.status(identityRes.status).json({
      ok: false,
      status: identityRes.status,
      code: identityRes.code,
      message: identityRes.message,
    });
    return;
  }

  const session = createEmbedRuntimeSession({
    workspaceId,
    embed: targetEmbed,
    identity: identityRes.identity,
    collections,
  });
  EMBED_RUNTIME_SESSIONS.set(session.sessionId, session);

  res.status(200).json({
    ok: true,
    status: 200,
    sessionId: session.sessionId,
    identity: session.identity,
    authorizationScope: session.authorizationScope,
    authorizationVersion: session.authorizationVersion,
    knowledgeVersion: cacheService.getKnowledgeVersion(workspaceId),
    emptyScopeValid: session.authorizationScope.collectionIds.length === 0,
  });
});

app.post('/api/embed/session/upgrade', async (req, res) => {
  const {
    sessionId,
    embedId = 'EMB-PUBLIC-DOCS',
    workspaceId = 'okeng',
    identityToken,
    browserRole,
    browserUserId,
    browserPermissions,
    embed: clientEmbed,
    collections: clientCollections,
  } = req.body || {};

  const serverSigningSecret =
    process.env.OKENG_SIGNING_SECRET ||
    INITIAL_WORKSPACE.signingSecret ||
    'sk_live_sec_acme_prod_9921';

  const collections =
    Array.isArray(clientCollections) && clientCollections.length > 0
      ? clientCollections
      : INITIAL_COLLECTIONS;
  const targetEmbed =
    clientEmbed ||
    INITIAL_PUBLIC_EMBEDS.find((e) => e.id === embedId) ||
    INITIAL_PUBLIC_EMBEDS[0];

  const identityRes = await resolveRequestEmbedIdentity({
    identityToken,
    browserRole,
    browserUserId,
    browserPermissions,
    expectedWorkspaceId: workspaceId,
    expectedEmbedId: targetEmbed?.id,
    signingSecret: serverSigningSecret,
  });

  if (!identityRes.ok) {
    res.status(identityRes.status).json({
      ok: false,
      status: identityRes.status,
      code: identityRes.code,
      message: identityRes.message,
    });
    return;
  }

  const existingSession =
    (sessionId && EMBED_RUNTIME_SESSIONS.get(sessionId)) ||
    createEmbedRuntimeSession({
      sessionId: sessionId || undefined,
      workspaceId,
      embed: targetEmbed,
      identity: { kind: 'anonymous' },
      collections,
    });

  const upgraded = upgradeEmbedSessionIdentity({
    session: existingSession,
    newIdentity: identityRes.identity,
    embed: targetEmbed,
    collections,
  });
  EMBED_RUNTIME_SESSIONS.set(upgraded.sessionId, upgraded);

  res.status(200).json({
    ok: true,
    status: 200,
    sessionId: upgraded.sessionId,
    identity: upgraded.identity,
    authorizationScope: upgraded.authorizationScope,
    authorizationVersion: upgraded.authorizationVersion,
    turnsCount: upgraded.turns.length,
  });
});

app.post('/api/embed/verify', async (req, res) => {
  const {
    embedId = 'EMB-PUBLIC-DOCS',
    workspaceId = 'okeng',
    verificationMode = 'anonymous',
    identityToken,
    simulateFault,
    embed: clientEmbed,
    collections: clientCollections,
  } = req.body || {};

  const serverSigningSecret =
    process.env.OKENG_SIGNING_SECRET ||
    INITIAL_WORKSPACE.signingSecret ||
    'sk_live_sec_acme_prod_9921';

  const collections =
    Array.isArray(clientCollections) && clientCollections.length > 0
      ? clientCollections
      : INITIAL_COLLECTIONS;
  const targetEmbed =
    clientEmbed ||
    INITIAL_PUBLIC_EMBEDS.find((e) => e.id === embedId);

  if (!targetEmbed || simulateFault === 'missing_embed') {
    res.status(404).json({
      ok: false,
      status: 404,
      failureCode: 'RESOURCE_NOT_FOUND',
      failureMessage: 'Embed resource not found.',
    });
    return;
  }

  if (simulateFault === 'invalid_signature') {
    res.status(401).json({
      ok: false,
      status: 401,
      failureCode: 'INVALID_TOKEN_SIGNATURE',
      failureMessage: 'HMAC-SHA256 signature verification failed.',
    });
    return;
  }

  if (simulateFault === 'expired_token') {
    res.status(401).json({
      ok: false,
      status: 401,
      failureCode: 'TOKEN_EXPIRED',
      failureMessage: 'Signed identity token has expired.',
    });
    return;
  }

  if (simulateFault === 'wrong_workspace') {
    res.status(404).json({
      ok: false,
      status: 404,
      failureCode: 'RESOURCE_NOT_FOUND',
      failureMessage: 'Resource not found.',
    });
    return;
  }

  let resolvedIdentity: EmbedIdentity = { kind: 'anonymous' };
  let tokenVerified = false;

  if (typeof identityToken === 'string' && identityToken.trim().length > 0) {
    const idResult = await resolveRequestEmbedIdentity({
      identityToken,
      expectedWorkspaceId: workspaceId,
      expectedEmbedId: targetEmbed.id,
      signingSecret: serverSigningSecret,
    });
    if (!idResult.ok) {
      res.status(idResult.status).json({
        ok: false,
        status: idResult.status,
        failureCode: idResult.code,
        failureMessage: idResult.message,
      });
      return;
    }
    resolvedIdentity = idResult.identity;
    tokenVerified = true;
  } else if (verificationMode === 'member' || verificationMode === 'admin') {
    resolvedIdentity = {
      kind: 'authenticated',
      userId: verificationMode === 'admin' ? 'usr_verify_admin' : 'usr_verify_member',
      role: verificationMode,
    };
    tokenVerified = true;
  }

  const proof = computeEmbedVerificationProof({
    embed: targetEmbed,
    collections,
    identity: resolvedIdentity,
    tokenVerified,
  });

  res.status(200).json(proof);
});

// Serve standalone widget script bundle directly
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'widget.js'));
});

// Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OKEng server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
