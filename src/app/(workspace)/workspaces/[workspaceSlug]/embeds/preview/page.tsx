'use client';

// ============================================================================
// ARCH-001 §5.1 & EMBED-02: Standalone Host Simulator Route (SU-EMBED-HOST-SIMULATOR)
// Route: /workspaces/[workspaceSlug]/embeds/preview
// ============================================================================

import React from 'react';
import { WidgetPreviewView } from '../../../../../../pages/WidgetPreviewView';
import { useParams, useRouter } from '../../../../../router';

export default function WorkspaceEmbedPreviewPage() {
  const { workspaceSlug = 'okeng', embedId, from } = useParams<{
    workspaceSlug?: string;
    embedId?: string;
    from?: string;
  }>();
  const { navigateRoute } = useRouter();

  return (
    <WidgetPreviewView
      initialEmbedId={embedId}
      onBack={(activeEmbedId) =>
        navigateRoute('embed', {
          workspaceSlug,
          ...(from === 'detail' && (activeEmbedId || embedId)
            ? { embedId: activeEmbedId || embedId! }
            : {}),
        })
      }
    />
  );
}
