'use client';

// ============================================================================
// ARCH-001 §5.1: Workspace Files Route
// Route: /workspaces/[workspaceSlug]/files
// ============================================================================

import React from 'react';
import { GlobalFilesView } from '../../../../../pages/GlobalFilesView';
import { useParams, useRouter } from '../../../../router';

export default function WorkspaceFilesPage() {
  const { workspaceSlug = 'okeng' } = useParams<{ workspaceSlug?: string }>();
  const { navigateRoute } = useRouter();

  return (
    <GlobalFilesView
      onEditDocument={(docId) => navigateRoute('file-edit', { workspaceSlug, documentId: docId })}
      onCreateMarkdown={() => navigateRoute('file-edit', { workspaceSlug })}
    />
  );
}
