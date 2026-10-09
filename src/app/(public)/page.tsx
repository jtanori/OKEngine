'use client';

// ============================================================================
// ARCH-001 & PUBLIC-01: Public Platform Home Page (PAGE-PUB-01)
// Route Group: (public) -> / (and /about, /terms, /privacy, /acceptable-use, /contact)
// ============================================================================

import React from 'react';
import { PublicSurfaceView, PublicPageType } from '../../pages/PublicSurfaceView';
import { usePathname, useRouter } from '../router';

export default function PublicHomePage() {
  const pathname = usePathname();
  const { push, navigateRoute } = useRouter();

  const initialPage: PublicPageType =
    pathname === '/about'
      ? 'about'
      : pathname === '/terms'
      ? 'terms'
      : pathname === '/privacy'
      ? 'privacy'
      : pathname === '/acceptable-use'
      ? 'acceptable-use'
      : pathname === '/contact'
      ? 'contact'
      : 'landing';

  return (
    <PublicSurfaceView
      initialPage={initialPage}
      onNavigatePath={(path) => push(path)}
      onEnterWorkspace={(slug, editDocId) => {
        if (editDocId) {
          navigateRoute('file-edit', { workspaceSlug: slug, documentId: editDocId });
        } else {
          navigateRoute('collections', { workspaceSlug: slug });
        }
      }}
    />
  );
}
