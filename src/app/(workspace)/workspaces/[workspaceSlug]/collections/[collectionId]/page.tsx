'use client';

// ============================================================================
// ARCH-001 §5.1: Workspace Collection Detail Route
// Route: /workspaces/[workspaceSlug]/collections/[collectionId]
// ============================================================================

import React from 'react';
import { CollectionDetailView } from '../../../../../../pages/CollectionDetailView';
import { useParams, useRouter } from '../../../../../router';

export default function WorkspaceCollectionDetailPage() {
  const { workspaceSlug = 'okeng', collectionId = 'COL-PUBLIC' } = useParams<{
    workspaceSlug?: string;
    collectionId?: string;
  }>();
  const { navigateRoute } = useRouter();

  return (
    <CollectionDetailView
      collectionId={collectionId}
      onBack={() => navigateRoute('collections', { workspaceSlug })}
      onEditDocument={(docId) =>
        navigateRoute('file-edit', { workspaceSlug, collectionId, documentId: docId })
      }
      onCreateMarkdown={(colId) =>
        navigateRoute('file-edit', { workspaceSlug, collectionId: colId })
      }
      onTestCollection={(colId) =>
        navigateRoute('test', { workspaceSlug, collectionId: colId })
      }
    />
  );
}
