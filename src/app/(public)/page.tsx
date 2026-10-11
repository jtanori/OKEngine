'use client';

// ============================================================================
// ARCH-001 & PUBLIC-01: Public Platform Home Page (PAGE-PUB-01) v3.0
// Route Group: (public) -> / (landing v3.0 from proposal)
// PA-LANDING archetype with 12 surfaces, proper Next.js App Router
// ============================================================================

import React from 'react';
import { LandingView } from '@/components/landing/LandingView';
import { PublicSurfaceView, PublicPageType } from '../../pages/PublicSurfaceView';
import { usePathname, useRouter } from '../router';

export default function PublicHomePage() {
  const pathname = usePathname();
  const { push, navigateRoute } = useRouter();

  // For root '/', use new LandingView v3.0
  // For other public pages (/about, /terms, etc), keep PublicSurfaceView legacy for now
  if (pathname === '/' || pathname === '') {
    return <LandingView />;
  }

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
