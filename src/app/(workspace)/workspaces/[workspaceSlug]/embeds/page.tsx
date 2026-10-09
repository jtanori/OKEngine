'use client';

// ============================================================================
// ARCH-001 §5.1 & EMBED-02: Workspace Embeds Collection & Detail Route
// Routes:
//   - Stage 1 (Collection): /workspaces/[workspaceSlug]/embeds
//   - Stage 2 (Resource):   /workspaces/[workspaceSlug]/embeds/[embedId]?tab=...
// ============================================================================

import React from 'react';
import { EmbedConfigView, EmbedConfigSection } from '../../../../../pages/EmbedConfigView';
import { useParams, useRouter } from '../../../../router';

export default function WorkspaceEmbedsPage() {
  const { workspaceSlug = 'okeng', embedId, tab } = useParams<{
    workspaceSlug?: string;
    embedId?: string;
    tab?: string;
  }>();
  const { navigateRoute } = useRouter();

  return (
    <EmbedConfigView
      initialSelectedEmbedId={embedId || null}
      initialTab={(tab as EmbedConfigSection) || null}
      onSelectEmbed={(nextEmbedId, nextTab) => {
        navigateRoute('embed', {
          workspaceSlug,
          ...(nextEmbedId ? { embedId: nextEmbedId } : {}),
          ...(nextTab ? { tab: nextTab } : {}),
        });
      }}
      onOpenInstallation={(targetEmbedId) => {
        navigateRoute('embed-installation', {
          workspaceSlug,
          embedId: targetEmbedId,
        });
      }}
      onOpenWidgetPreview={(targetEmbedId, fromDetail) => {
        navigateRoute('widget-preview', {
          workspaceSlug,
          ...(targetEmbedId ? { embedId: targetEmbedId } : {}),
          ...(fromDetail ? { from: 'detail' } : {}),
        });
      }}
    />
  );
}
