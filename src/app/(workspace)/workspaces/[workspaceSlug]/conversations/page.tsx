'use client';

// ============================================================================
// ARCH-001 §5.1: Workspace Conversations Log Route (PAGE-APP-07 / PA-INSPECTOR)
// Route: /workspaces/[workspaceSlug]/conversations
// ============================================================================

import React from 'react';
import { ConversationsView } from '../../../../../pages/ConversationsView';
import { useParams, useRouter } from '../../../../router';

export default function WorkspaceConversationsPage() {
  const { workspaceSlug = 'okeng' } = useParams<{ workspaceSlug?: string }>();
  const { navigateRoute } = useRouter();

  return (
    <ConversationsView
      onOpenDocument={(docId) => {
        navigateRoute('file-edit', { workspaceSlug, documentId: docId });
      }}
    />
  );
}
