'use client';

// PA-DOCS — Docs article page v3.0 dedicated route /docs/:slug
import React from 'react';
import { DocsView } from '../../../../components/docs/DocsView';
import { useParams, useRouter } from '../../../router';

export default function DocsSlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const { push, navigateRoute } = useRouter();

  return (
    <DocsView
      initialSlug={slug || 'getting-started'}
      onNavigatePath={(path) => push(path)}
    />
  );
}
