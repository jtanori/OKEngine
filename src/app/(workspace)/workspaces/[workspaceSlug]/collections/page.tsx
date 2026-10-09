'use client';

// ============================================================================
// ARCH-001 §5.1: Workspace Collections Route (PAGE-APP-01 / PA-DIRECTORY)
// Route: /workspaces/[workspaceSlug]/collections
// ============================================================================

import React from 'react';
import { CollectionsView } from '../../../../../pages/CollectionsView';
import { useParams, useRouter } from '../../../../router';

export default function WorkspaceCollectionsPage() {
  const { workspaceSlug = 'okeng' } = useParams<{ workspaceSlug?: string }>();
  const { navigateRoute } = useRouter();

  return (
    <CollectionsView
      onSelectCollection={(colId) => {
        navigateRoute('collection-detail', { workspaceSlug, collectionId: colId });
      }}
    />
  );
}
