'use client';

// ============================================================================
// ARCH-001 §5.1: Workspace Document Editor Route
// Route: /workspaces/[workspaceSlug]/files/[documentId]
// Enforces deterministic logical-parent Back & breadcrumb resolution
// ============================================================================

import React from 'react';
import { MarkdownEditor } from '../../../../../../components/MarkdownEditor';
import { useParams, useRouter } from '../../../../../router';
import { store } from '../../../../../../services/store';

export default function WorkspaceFileEditorPage() {
  const { workspaceSlug = 'okeng', documentId, collectionId } = useParams<{
    workspaceSlug?: string;
    documentId?: string;
    collectionId?: string;
  }>();
  const { navigateRoute } = useRouter();

  const existingDoc = documentId ? store.getDocument(documentId) : undefined;
  const resolvedParentCollectionId = collectionId || existingDoc?.collectionId;

  return (
    <MarkdownEditor
      documentId={documentId}
      initialCollectionId={resolvedParentCollectionId}
      parentContext={collectionId ? 'collection' : 'files'}
      onNavigateToCollections={() => navigateRoute('collections', { workspaceSlug })}
      onNavigateToCollection={(colId) =>
        navigateRoute('collection-detail', { workspaceSlug, collectionId: colId })
      }
      onNavigateToFiles={() => navigateRoute('files', { workspaceSlug })}
      onBack={() => {
        if (collectionId) {
          navigateRoute('collection-detail', { workspaceSlug, collectionId });
        } else if (existingDoc?.collectionId && !collectionId) {
          navigateRoute('files', { workspaceSlug });
        } else {
          navigateRoute('files', { workspaceSlug });
        }
      }}
      onSaved={() => {
        // Remains in editor after Save & Index (CLEAN state) so author can continue working
      }}
    />
  );
}
