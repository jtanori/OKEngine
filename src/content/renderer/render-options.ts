// ============================================================================
// RENDER-001 §49, §50, §67–69: Render Context & Permission Action Policy
// Maps the 10 canonical presentation contexts and caller roles to deterministic
// RenderOptions and ContentPermissions.
// ============================================================================

import {
  ContentPermissions,
  RenderContext,
  RenderOptions,
} from '../content.types';

export type CallerRoleKind =
  | 'anonymous'
  | 'authenticated_reader'
  | 'authenticated_editor'
  | 'workspace_owner';

export function resolveContextOptions(
  context: RenderContext,
  overrides: RenderOptions = {}
): Required<RenderOptions> {
  const isFullDoc = context === 'DOCUMENT_FULL' || context === 'PUBLIC_DOC';
  const isPreview = context === 'DOCUMENT_PREVIEW' || context === 'EDITOR_PREVIEW';
  const isAnswer =
    context === 'CHAT_ANSWER' ||
    context === 'TEST_CHAT' ||
    context === 'EMBEDDED_CHAT';
  const isExcerpt = context === 'SOURCE_EXCERPT' || context === 'CITATION';

  return {
    allowImages: overrides.allowImages ?? !isExcerpt,
    allowMedia: overrides.allowMedia ?? (isFullDoc || isPreview),
    showCodeCopy: overrides.showCodeCopy ?? !isExcerpt,
    showTableOfContents: overrides.showTableOfContents ?? isFullDoc,
    showHeadingAnchors: overrides.showHeadingAnchors ?? isFullDoc,
    showActions: overrides.showActions ?? (isFullDoc || isAnswer),
    showMetadata: overrides.showMetadata ?? isFullDoc,
    showCitations: overrides.showCitations ?? isAnswer,
    maxContentLength: overrides.maxContentLength ?? (isExcerpt ? 600 : 0),
    linkBehavior: overrides.linkBehavior ?? 'new-tab',
  };
}

/**
 * Resolves deterministic action availability per RENDER-TEST-001 §30 (RENDER-026 & RENDER-027).
 * Edit Source is strictly false for anonymous and read-only users.
 */
export function resolveActionPermissions(
  roleKind: CallerRoleKind,
  options: {
    isPublicDocument?: boolean;
    isAnswerContext?: boolean;
    overrides?: ContentPermissions;
  } = {}
): Required<ContentPermissions> {
  const { isPublicDocument = true, isAnswerContext = false, overrides = {} } = options;

  const isEditorOrOwner =
    roleKind === 'authenticated_editor' || roleKind === 'workspace_owner';
  const isAuthenticated = roleKind !== 'anonymous';

  return {
    canCopy: overrides.canCopy ?? true,
    canShare: overrides.canShare ?? (isAuthenticated || isPublicDocument),
    canSave: overrides.canSave ?? (isAuthenticated || isPublicDocument),
    canSaveToWorkspace: overrides.canSaveToWorkspace ?? (isEditorOrOwner && isAnswerContext),
    canEdit: overrides.canEdit ?? isEditorOrOwner,
    canViewOriginal: overrides.canViewOriginal ?? isAuthenticated,
    canReport: overrides.canReport ?? true,
    canRegenerate: overrides.canRegenerate ?? isAnswerContext,
  };
}
