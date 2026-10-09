// ============================================================================
// ARCH-MIG-001 & ARCH-001 §5.1: Canonical App Router Dispatcher
// Delegates all routing to the Next.js App Router hierarchy under src/app/*
// ============================================================================

import React from 'react';
import RootLayout from './app/layout';
import NotFound from './app/not-found';
import { usePathname, useAppRoute, useParams } from './app/router';
import PublicHomePage from './app/(public)/page';
import PublicDocsPage from './app/(public)/docs/page';
import LoginPage from './app/(auth)/login/page';
import WorkspaceLayout from './app/(workspace)/workspaces/[workspaceSlug]/layout';
import WorkspaceCollectionsPage from './app/(workspace)/workspaces/[workspaceSlug]/collections/page';
import WorkspaceCollectionDetailPage from './app/(workspace)/workspaces/[workspaceSlug]/collections/[collectionId]/page';
import WorkspaceFilesPage from './app/(workspace)/workspaces/[workspaceSlug]/files/page';
import WorkspaceFileEditorPage from './app/(workspace)/workspaces/[workspaceSlug]/files/[documentId]/page';
import WorkspaceEmbedsPage from './app/(workspace)/workspaces/[workspaceSlug]/embeds/page';
import WorkspaceEmbedInstallationPage from './app/(workspace)/workspaces/[workspaceSlug]/embeds/installation/page';
import WorkspaceEmbedPreviewPage from './app/(workspace)/workspaces/[workspaceSlug]/embeds/preview/page';
import WorkspaceTestConsolePage from './app/(workspace)/workspaces/[workspaceSlug]/test/page';
import WorkspaceConversationsPage from './app/(workspace)/workspaces/[workspaceSlug]/conversations/page';
import WorkspaceStitchPage from './app/(workspace)/workspaces/[workspaceSlug]/stitch/page';
import WorkspaceSettingsPage from './app/(workspace)/workspaces/[workspaceSlug]/settings/page';

const KNOWN_PUBLIC_PATHS = new Set([
  '/',
  '/about',
  '/terms',
  '/privacy',
  '/acceptable-use',
  '/contact',
]);

function AppRouterView() {
  const pathname = usePathname();
  const appRoute = useAppRoute();
  const params = useParams<{ workspaceSlug?: string }>();

  // 1. Standalone Host Simulator Route (/workspaces/[workspaceSlug]/embeds/preview)
  if (appRoute === 'widget-preview') {
    return <WorkspaceEmbedPreviewPage />;
  }

  // 2. Authentication Route Group ((auth) -> /login, /signup, /forgot-password, /password/reset)
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/password/reset'
  ) {
    return <LoginPage />;
  }

  // 3. Public Documentation Route Group ((public) -> /docs, /docs/[slug])
  if (appRoute === 'public-docs' || pathname.startsWith('/docs')) {
    return <PublicDocsPage />;
  }

  // 4. Workspace Route Group ((workspace) -> /workspaces/[workspaceSlug]/* & /app/embed/* aliases)
  if (pathname.startsWith('/workspaces/') || pathname.startsWith('/app/embed')) {
    return (
      <WorkspaceLayout workspaceSlug={params.workspaceSlug}>
        {appRoute === 'collections' && <WorkspaceCollectionsPage />}
        {appRoute === 'collection-detail' && <WorkspaceCollectionDetailPage />}
        {appRoute === 'files' && <WorkspaceFilesPage />}
        {appRoute === 'file-edit' && <WorkspaceFileEditorPage />}
        {appRoute === 'embed' && <WorkspaceEmbedsPage />}
        {appRoute === 'embed-installation' && <WorkspaceEmbedInstallationPage />}
        {appRoute === 'test' && <WorkspaceTestConsolePage />}
        {appRoute === 'conversations' && <WorkspaceConversationsPage />}
        {appRoute === 'stitch' && <WorkspaceStitchPage />}
        {appRoute === 'settings' && <WorkspaceSettingsPage />}
      </WorkspaceLayout>
    );
  }

  // 5. Public Platform Surface Route Group ((public) -> /, /about, /terms, /privacy, /acceptable-use, /contact)
  if (KNOWN_PUBLIC_PATHS.has(pathname)) {
    return <PublicHomePage />;
  }

  // 6. Unmatched Route -> Canonical NotFound (src/app/not-found.tsx)
  return <NotFound />;
}

export default function App() {
  return (
    <RootLayout>
      <AppRouterView />
    </RootLayout>
  );
}
