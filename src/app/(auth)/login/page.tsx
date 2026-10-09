'use client';

// ============================================================================
// ARCH-001 & AUTH-04: Authentication Login Route (SURF-AUTH)
// Route Group: (auth) -> /login and /signup
// ============================================================================

import React from 'react';
import { PublicSurfaceView } from '../../../pages/PublicSurfaceView';
import { usePathname, useRouter } from '../../router';

export default function LoginPage({ authRedirectMessage }: { authRedirectMessage?: string }) {
  const pathname = usePathname();
  const { push, navigateRoute } = useRouter();

  const initialAuthPage =
    pathname === '/signup'
      ? 'signup'
      : pathname === '/forgot-password' || pathname === '/password/reset'
      ? 'forgot-password'
      : 'login';

  return (
    <PublicSurfaceView
      initialPage={initialAuthPage}
      authRedirectMessage={authRedirectMessage}
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
