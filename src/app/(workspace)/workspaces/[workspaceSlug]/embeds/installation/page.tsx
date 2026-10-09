'use client';

// ============================================================================
// ARCH-001 §5.1 & APP-05: Dedicated Embed Installation Route
// Routes:
//   - /workspaces/[workspaceSlug]/embeds/[embedId]/installation
//   - /app/embed/[embedId]/installation
// ============================================================================

import React from 'react';
import { EmbedInstallationView } from '../../../../../../pages/EmbedInstallationView';
import { useParams, useRouter } from '../../../../../router';

export default function WorkspaceEmbedInstallationPage() {
  const { workspaceSlug = 'okeng', embedId } = useParams<{
    workspaceSlug?: string;
    embedId?: string;
  }>();
  const { navigateRoute } = useRouter();

  return (
    <EmbedInstallationView
      embedId={embedId || null}
      onBackToEmbed={(id) =>
        navigateRoute('embed', {
          workspaceSlug,
          embedId: id,
        })
      }
      onBackToEmbedsList={() =>
        navigateRoute('embed', {
          workspaceSlug,
        })
      }
      onNavigateToConfigTab={(id, tab) =>
        navigateRoute('embed', {
          workspaceSlug,
          embedId: id,
          tab,
        })
      }
      onOpenSimulator={(id) =>
        navigateRoute('widget-preview', {
          workspaceSlug,
          embedId: id,
          from: 'detail',
        })
      }
    />
  );
}
