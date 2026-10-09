'use client';

// ============================================================================
// ARCH-001 §5.1: Workspace Test Console Route (PAGE-APP-06 / PA-CONSOLE)
// Route: /workspaces/[workspaceSlug]/test
// ============================================================================

import React from 'react';
import { TestConsoleView } from '../../../../../pages/TestConsoleView';
import { useParams, useRouter } from '../../../../router';

export default function WorkspaceTestConsolePage() {
  const {
    workspaceSlug = 'okeng',
    collectionId,
    embedId,
  } = useParams<{
    workspaceSlug?: string;
    collectionId?: string;
    embedId?: string;
  }>();
  const { navigateRoute } = useRouter();

  return (
    <TestConsoleView
      initialCollectionId={collectionId}
      initialEmbedId={embedId}
      onOpenDocument={(docId) => {
        navigateRoute('file-edit', { workspaceSlug, documentId: docId });
      }}
    />
  );
}
