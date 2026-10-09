// ============================================================================
// ARCH-001 & ENGINE-01: App Router Route Handler for Retrieval & Compilation
// Path: src/app/api/chat/stream/route.ts
// Enforces Pre-Retrieval Authorization (SECURITY-001) + Deterministic Compiler
// ============================================================================

import { repositories } from '../../../../repositories';
import {
  compileKnowledgeResponse,
  AnswerMode,
} from '../../../../services/engine/responseCompiler';
import { validateChatQuestion } from '../../../../services/validation';
import { AccessVisibility } from '../../../../types';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const qCheck = validateChatQuestion(body?.question);
  if (!qCheck.valid || !qCheck.sanitized) {
    return new Response(JSON.stringify({ error: qCheck.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const workspaceId: string = body?.workspaceId || 'okeng';
  const effectiveRole: AccessVisibility = body?.role || 'everyone';
  const answerMode: AnswerMode = body?.answerMode || 'deterministic';
  const currentUrl: string = body?.currentUrl || '/dashboard';

  const allowedTiers: AccessVisibility[] =
    effectiveRole === 'admins'
      ? ['everyone', 'members', 'admins']
      : effectiveRole === 'members'
      ? ['everyone', 'members']
      : ['everyone'];

  const authorizedCollections = await repositories.collections.listByWorkspace(
    workspaceId,
    allowedTiers
  );
  const authorizedColIds = authorizedCollections.map((c) => c.id);

  const authorizedDocs = await repositories.documents.listAuthorized({
    workspaceId,
    authorizedCollectionIds: authorizedColIds,
    narrowedDocumentIds: body?.allowedDocumentIds,
  });

  const plan = compileKnowledgeResponse({
    question: qCheck.sanitized,
    authorizedDocs,
    currentUrl,
    answerMode,
    isEmbedMode: body?.mode === 'embed',
    effectiveRole,
  });

  await repositories.usage.recordEvent({
    workspaceId,
    eventType: 'retrieval_query',
    answerMode,
    tokensUsed: plan.compiledMarkdown.split(/\s+/).length,
    latencyMs: plan.latencyMs,
  });

  return new Response(JSON.stringify(plan), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
