'use client';

// ============================================================================
// ARCH-001 & PUBLIC-01: Public Documentation Hub (PAGE-PUB-06 / PAGE-PUB-07)
// Route Group: (public) -> /docs and /docs/[slug]
// ============================================================================

import React from 'react';
import { PublicSurfaceView } from '../../../pages/PublicSurfaceView';
import { useParams, useRouter } from '../../router';

export default function PublicDocsPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { push, navigateRoute } = useRouter();

  return (
    <PublicSurfaceView
      initialPage="docs"
      initialDocSlug={slug}
      onNavigatePath={(path) => push(path)}
      onEnterWorkspace={(wsSlug, editDocId) => {
        if (editDocId) {
          navigateRoute('file-edit', { workspaceSlug: wsSlug, documentId: editDocId });
        } else {
          navigateRoute('collections', { workspaceSlug: wsSlug });
        }
      }}
    />
  );
}
