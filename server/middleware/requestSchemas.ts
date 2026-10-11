/**
 * Layer 1 Structural Validation - Strict Schemas with .strict() unknown-key rejection
 * Implements API-01 §2 Layer 1 validation
 */

import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// Common strict string validators
const workspaceIdSchema = z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/);
const collectionIdSchema = z.string().min(1).max(120);
const documentIdSchema = z.string().min(1).max(120);
const embedIdSchema = z.string().min(1).max(120);
const memberIdSchema = z.string().min(1).max(120);
const emailSchema = z.string().email().max(254);
const nonEmptyString = (min = 1, max = 1000) => z.string().min(min).max(max);

// Forbidden client-supplied fields that must be rejected in staging/prod
const FORBIDDEN_CLIENT_FIELDS = [
  'documents',
  'collections',
  'embeds',
  'contextChunks',
  'roleKind',
  'isPublicDocument',
  'signingSecret',
  'signing_secret',
  'permissions',
  'role',
  'workspace_id', // use workspaceId instead
];

function checkForbiddenFields(body: any): string[] {
  if (!body || typeof body !== 'object') return [];
  const found: string[] = [];
  for (const field of FORBIDDEN_CLIENT_FIELDS) {
    if (field in body) {
      found.push(field);
    }
  }
  return found;
}

export function validateStrictBody(schema: z.ZodTypeAny, options?: { allowForbidden?: string[] }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body || {};

    // Check forbidden fields unless explicitly allowed
    const allowedForbidden = options?.allowForbidden || [];
    const forbiddenToCheck = FORBIDDEN_CLIENT_FIELDS.filter(f => !allowedForbidden.includes(f));
    const foundForbidden: string[] = [];
    for (const field of forbiddenToCheck) {
      if (field in body) {
        // Special handling: these are always forbidden in staging/prod for certain routes
        if (['documents', 'collections', 'embeds', 'contextChunks', 'signingSecret', 'isPublicDocument'].includes(field)) {
          // For chat/stream and embed/session routes, reject immediately
          if (req.path.includes('/chat/stream') || req.path.includes('/embed/session')) {
            if (['documents', 'collections', 'embeds', 'contextChunks'].includes(field)) {
              res.status(400).json({
                error: 'VALIDATION_ERROR',
                code: 'SCHEMA_UNKNOWN_FIELD',
                field,
                message: `Field '${field}' is not allowed - server resolves corpus from repository`,
              });
              return;
            }
          }
          if (req.path.includes('/embed/share') && field === 'isPublicDocument') {
            res.status(400).json({
              error: 'VALIDATION_ERROR',
              code: 'SCHEMA_UNKNOWN_FIELD',
              field,
              message: `Field '${field}' is server-derived from collection.visibility`,
            });
            return;
          }
          if (field === 'signingSecret' || field === 'signing_secret') {
            res.status(400).json({
              error: 'VALIDATION_ERROR',
              code: 'SCHEMA_UNKNOWN_FIELD',
              field,
              message: `Field '${field}' must not be supplied by client`,
            });
            return;
          }
        }
      }
    }

    // For routes that must reject client corpus, check explicitly
    const env = (process.env.OKENG_ENV || 'development').toLowerCase();
    const isStagingProd = env === 'staging' || env === 'production';
    
    if (isStagingProd) {
      if (req.path.includes('/chat/stream') || req.path.includes('/chat') && req.method === 'POST') {
        const forbiddenInChat = ['documents', 'collections', 'embeds', 'contextChunks', 'signingSecret'];
        for (const f of forbiddenInChat) {
          if (f in body) {
            res.status(400).json({
              error: 'VALIDATION_ERROR',
              code: 'SCHEMA_UNKNOWN_FIELD',
              field: f,
              message: `Client-supplied '${f}' rejected in ${env} mode`,
            });
            return;
          }
        }
      }
      if (req.path.includes('/embed/session')) {
        const forbiddenInSession = ['embed', 'collections', 'documents', 'signingSecret'];
        for (const f of forbiddenInSession) {
          if (f in body) {
            res.status(400).json({
              error: 'VALIDATION_ERROR',
              code: 'SCHEMA_UNKNOWN_FIELD',
              field: f,
              message: `Client-supplied '${f}' rejected - server loads from repository`,
            });
            return;
          }
        }
      }
    }

    try {
      const parsed = schema.parse(body);
      req.body = parsed;
      next();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const firstIssue = err.issues[0];
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          code: firstIssue?.code === 'unrecognized_keys' ? 'SCHEMA_UNKNOWN_FIELD' : 'VALIDATION_ERROR',
          field: firstIssue?.path.join('.') || 'unknown',
          message: firstIssue?.message,
          requestId: (req as any).requestId,
        });
        return;
      }
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
      });
    }
  };
}

// Route schemas - strict mode

export const authLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
}).strict();

export const authSignupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  acceptedTos: z.literal(true),
}).strict();

export const authLogoutSchema = z.object({}).strict();

export const authRefreshSchema = z.object({}).strict();

export const authPasswordResetSchema = z.object({
  email: emailSchema,
}).strict();

export const tokenSignSchema = z.object({
  workspaceId: workspaceIdSchema,
  embedId: embedIdSchema.optional(),
  sub: z.string().min(1).max(128),
  role: z.string().min(1).max(50),
  ttlSeconds: z.number().int().min(60).max(300).optional(),
}).strict();

export const tokenVerifySchema = z.object({
  workspaceId: workspaceIdSchema,
  embedId: embedIdSchema.optional(),
  token: z.string().min(10).max(5000),
}).strict();

export const workspacePatchSchema = z.object({
  name: z.string().min(2).max(80),
}).strict();

export const collectionCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['everyone', 'members', 'admins']),
}).strict();

export const collectionPatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['everyone', 'members', 'admins']).optional(),
}).strict();

export const documentEditSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(262144).optional(),
  collectionId: collectionIdSchema.optional(),
  nextStep: z.object({
    label: z.string().min(1).max(100),
    url: z.string().min(1).max(500),
  }).optional(),
}).strict();

export const fileUploadSchema = z.object({
  collectionId: collectionIdSchema,
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['text/markdown', 'text/plain', 'application/pdf']),
  content: z.string().min(1).max(10 * 1024 * 1024),
}).strict();

export const embedSessionSchema = z.object({
  workspaceId: workspaceIdSchema,
  embedId: embedIdSchema,
  identityToken: z.string().min(10).max(5000).optional(),
}).strict();

export const embedSessionUpgradeSchema = z.object({
  sessionId: z.string().min(1).max(120),
  workspaceId: workspaceIdSchema,
  embedId: embedIdSchema,
  identityToken: z.string().min(10).max(5000),
}).strict();

export const embedVerifySchema = z.object({
  workspaceId: workspaceIdSchema,
  embedId: embedIdSchema,
  verificationMode: z.enum(['anonymous', 'member', 'admin']),
  identityToken: z.string().min(10).max(5000).optional(),
  simulateFault: z.string().optional(),
}).strict();

export const chatStreamSchema = z.object({
  workspaceId: workspaceIdSchema,
  question: z.string().min(1).max(1000),
  currentUrl: z.string().max(500).optional(),
  answerMode: z.enum(['deterministic', 'extractive', 'generative']).optional(),
  responseLanguage: z.string().max(10).optional(),
  uiLanguage: z.string().max(10).optional(),
  embedId: embedIdSchema.optional(),
  scopeKey: z.string().max(120).optional(),
  targetScopeCollectionIds: z.array(z.string()).max(50).optional(),
  allowedDocumentIds: z.array(z.string()).max(100).optional(),
  knowledgeVersion: z.number().optional(),
}).strict();

export const chatSchema = z.object({
  workspaceId: workspaceIdSchema,
  question: z.string().min(1).max(1000),
  collectionIds: z.array(collectionIdSchema).max(20).optional(),
}).strict();

export const embedGenSchema = z.object({
  workspaceId: workspaceIdSchema,
  text: z.string().min(1).max(8000),
}).strict();

export const answerSaveSchema = z.object({
  workspaceId: workspaceIdSchema,
  collectionId: collectionIdSchema,
  title: z.string().min(1).max(200),
  answerMarkdown: z.string().min(1).max(262144),
  citations: z.array(z.object({
    title: z.string(),
    filename: z.string().optional(),
    collectionId: z.string(),
    docId: z.string().optional(),
  })).max(20),
}).strict();

export const answerExportSchema = z.object({
  workspaceId: workspaceIdSchema,
  documentId: documentIdSchema.optional(),
  content: z.string().min(1).max(262144),
  format: z.enum(['md', 'txt', 'html', 'pdf']),
  context: z.object({}).passthrough().optional(),
}).strict();

export const shareCreateSchema = z.object({
  workspaceId: workspaceIdSchema,
  collectionId: collectionIdSchema,
  documentId: documentIdSchema.optional(),
  content: z.string().min(1).max(262144),
  locale: z.enum(['en', 'es']).optional(),
  expiresInHours: z.number().int().min(1).max(720).optional(),
}).strict();

export const feedbackSchema = z.object({
  workspaceId: workspaceIdSchema,
  documentId: documentIdSchema.optional(),
  surface: z.enum(['DOCUMENT_FULL', 'EMBED_ANSWER', 'GUIDED_TOUR', 'TEST_CONSOLE']),
  rendererVersion: z.string().min(1).max(50),
  language: z.enum(['en', 'es']),
  category: z.enum(['formatting_problem', 'inaccurate_answer', 'broken_link', 'outdated_content', 'other']),
  notes: z.string().max(500),
}).strict();

export const demoHomepageSchema = z.object({
  presetId: z.string().min(1).max(100),
  currentUrl: z.string().max(500).optional(),
  locale: z.enum(['en', 'es']).optional(),
}).strict();

export const cacheInvalidateSchema = z.object({
  workspaceId: workspaceIdSchema,
}).strict();

export const securityValidateSchema = z.object({
  filename: z.string().max(255).optional(),
  url: z.string().max(2000).optional(),
  markdown: z.string().max(262144).optional(),
}).strict();

// Params schemas
export const workspaceParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
});

export const collectionParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  collectionId: collectionIdSchema,
});

export const documentParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  documentId: documentIdSchema,
});

export const embedParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  embedId: embedIdSchema,
});

export const fileParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  fileId: z.string().min(1).max(120),
});

export const memberParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  memberId: memberIdSchema,
});

export const shareParamsSchema = z.object({
  shareId: z.string().min(1).max(120),
});

export const docsSlugParamsSchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/),
});
