import { NextRequest, NextResponse } from 'next/server';
import { composeAuthResponseAppliers, getSessionContext } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { createRouteSupabaseClient } from '@/lib/supabase/server';
import { createUserScopedRepositories, shouldEnforceFailClosedPersistence } from '@/repositories';
import { memoryRepositories } from '@/repositories/memory.repository';
import { SystemPrivilegedRepository } from '@/repositories/systemPrivileged';
import { compileKnowledgeResponse, type AnswerMode } from '@/services/engine/responseCompiler';
import { validateChatQuestion } from '@/services/validation';
import type { AccessVisibility } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WORKSPACE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function errorResponse(error: string, status: number, apply = (response: NextResponse) => response): NextResponse {
  const response = NextResponse.json({ error }, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return apply(response);
}

function parseAnswerMode(value: unknown): AnswerMode {
  return value === 'extractive' || value === 'generative' ? value : 'deterministic';
}

function safeCurrentUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/dashboard';
  }
  try {
    const parsed = new URL(value, 'https://okengine.invalid');
    return parsed.origin === 'https://okengine.invalid' ? `${parsed.pathname}${parsed.search}` : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

function parseNarrowedDocumentIds(value: unknown): string[] | undefined | null {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 200 || value.some((id) => typeof id !== 'string' || !DOCUMENT_ID_PATTERN.test(id))) {
    return null;
  }
  return [...new Set(value as string[])];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rl = await rateLimit(request, 'READ');
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limit_exceeded', retryAfter: rl.retryAfter }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter), 'Cache-Control': 'no-store' },
    });
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > 256 * 1024) return errorResponse('request_too_large', 413);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return errorResponse('bad_request', 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse('bad_request', 400);
  }

  const qCheck = validateChatQuestion(body.question);
  if (!qCheck.valid || !qCheck.sanitized) return errorResponse(qCheck.error || 'invalid_question', 400);

  // The legacy host HMAC token is not a Supabase Auth JWT and cannot establish
  // auth.uid(). Reject it instead of silently downgrading a claimed identity to
  // anonymous access. Public callers may still query RLS-approved public data.
  if (request.headers.has('authorization') || typeof body.token === 'string') {
    return errorResponse('unsupported_external_identity', 401);
  }

  const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : '';
  if (!WORKSPACE_ID_PATTERN.test(workspaceId)) return errorResponse('workspace_required', 400);
  const narrowedDocumentIds = parseNarrowedDocumentIds(body.allowedDocumentIds);
  if (narrowedDocumentIds === null) return errorResponse('invalid_document_scope', 400);
  const answerMode = parseAnswerMode(body.answerMode);
  const currentUrl = safeCurrentUrl(body.currentUrl);

  const useSupabase = shouldEnforceFailClosedPersistence();
  const cookies = request.cookies.getAll();
  const authCookiePresent = cookies.some(({ name }) => name.startsWith('okeng-auth'));
  const legacySessionCookiePresent = cookies.some(({ name }) => name === 'okeng.sid' || name === '__Host-okeng.sid');
  if (useSupabase && legacySessionCookiePresent) return errorResponse('unsupported_external_identity', 401);

  const sessionContext = await getSessionContext(request);
  const { session } = sessionContext;
  let applyToResponse = sessionContext.applyToResponse;
  if (authCookiePresent && !session) return errorResponse('unauthorized', 401, applyToResponse);
  let authorizedCollections: Array<{ id: string; visibility: AccessVisibility }> = [];
  let authorizedDocs: Awaited<ReturnType<typeof memoryRepositories.documents.listAuthorized>>;
  let effectiveRole: AccessVisibility = 'everyone';

  try {
    if (useSupabase) {
      const scopedClient = createRouteSupabaseClient(request);
      applyToResponse = composeAuthResponseAppliers(sessionContext.applyToResponse, scopedClient.applyToResponse);
      const { client } = scopedClient;
      let allowedTiers: AccessVisibility[] = ['everyone'];

      if (session) {
        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError || !authData.user || authData.user.id !== session.userId) return errorResponse('unauthorized', 401, applyToResponse);

        const { data: membership, error: membershipError } = await client
          .from('workspace_memberships')
          .select('role, permissions, status')
          .eq('workspace_id', workspaceId)
          .eq('user_id', session.userId)
          .eq('status', 'ACTIVE')
          .maybeSingle();
        if (membershipError) return errorResponse('database_unavailable', 503, applyToResponse);
        if (!membership) return errorResponse('forbidden', 403, applyToResponse);

        // Workspace visibility is governed by the verified workspace role, not
        // the caller's separate platform role.
        const canSeeAdmin = membership.role === 'WORKSPACE_OWNER';
        effectiveRole = canSeeAdmin ? 'admins' : 'members';
        allowedTiers = canSeeAdmin ? ['everyone', 'members', 'admins'] : ['everyone', 'members'];
      }

      const { data: collections, error: collectionError } = await client
        .from('collections')
        .select('id, workspace_id, name, description, visibility, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .in('visibility', allowedTiers);
      if (collectionError) return errorResponse('database_unavailable', 503, applyToResponse);
      authorizedCollections = collections || [];

      const repositories = createUserScopedRepositories(client);
      authorizedDocs = await repositories.documents.listAuthorized({
        workspaceId,
        authorizedCollectionIds: authorizedCollections.map((collection) => collection.id),
        narrowedDocumentIds,
      });

      if (session) {
        await SystemPrivilegedRepository.recordUsageEvent({
          workspaceId,
          eventType: 'retrieval_query',
          userId: session.userId,
          answerMode,
          tokensUsed: qCheck.sanitized.split(/\s+/).length,
        });
      }
    } else {
      let allowedTiers: AccessVisibility[] = ['everyone'];
      if (session) {
        if (session.workspaceId !== workspaceId) return errorResponse('forbidden', 403, applyToResponse);
        const canSeeAdmin = session.workspaceRole === 'WORKSPACE_OWNER' || session.role === 'admin' || session.role === 'super_admin';
        effectiveRole = canSeeAdmin ? 'admins' : 'members';
        allowedTiers = canSeeAdmin ? ['everyone', 'members', 'admins'] : ['everyone', 'members'];
      }

      authorizedCollections = await memoryRepositories.collections.listByWorkspace(workspaceId, allowedTiers);
      authorizedDocs = await memoryRepositories.documents.listAuthorized({
        workspaceId,
        authorizedCollectionIds: authorizedCollections.map((collection) => collection.id),
        narrowedDocumentIds,
      });
      if (session) {
        await memoryRepositories.usage.recordEvent({
          workspaceId,
          eventType: 'retrieval_query',
          answerMode,
          tokensUsed: qCheck.sanitized.split(/\s+/).length,
        });
      }
    }

    const plan = compileKnowledgeResponse({
      question: qCheck.sanitized,
      authorizedDocs,
      currentUrl,
      answerMode,
      isEmbedMode: body.mode === 'embed',
      effectiveRole,
    });

    const response = NextResponse.json(plan, { status: 200 });
    response.headers.set('Cache-Control', 'private, no-store');
    return applyToResponse(response);
  } catch (error) {
    console.error('[chat/stream] Retrieval failed', error instanceof Error ? error.message : 'unknown error');
    return errorResponse('database_unavailable', 503, applyToResponse);
  }
}
