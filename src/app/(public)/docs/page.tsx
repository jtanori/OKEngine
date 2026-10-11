'use client';

// ============================================================================
// PA-DOCS — Public Documentation Hub v3.0 dedicated route /docs
// Route Group: (public) -> /docs
// DocsView v3.0 with PA-DOCS archetype, editorial whitespace, ridiculously easy additions
// ============================================================================

import React from 'react';
import { DocsView } from '../../../components/docs/DocsView';
import { useRouter } from '../../router';

export default function PublicDocsPage() {
  const { push } = useRouter();

  return (
    <DocsView
      initialSlug="getting-started"
      onNavigatePath={(path) => push(path)}
    />
  );
}
