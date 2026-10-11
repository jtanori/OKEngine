// CO-DOCS-SIDEBAR — Sidebar with collections, search, auth-gated Engineering Specs, stronger typography, auto-select, FORM-SEC-01
import React, { useMemo, useState } from 'react';
import { DocsSidebar as PRDocsSidebar, DocsSidebarGroup } from '../ui/DocsSidebar';
import { store } from '../../services/store';
import { authService } from '../../services/auth';

export interface DocsSidebarCOProps {
  selectedSlug: string;
  onSelect: (slug: string) => void;
}

export function DocsSidebarCO({ selectedSlug, onSelect }: DocsSidebarCOProps) {
  const isAuthenticated = !!authService.getCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');

  const groups: DocsSidebarGroup[] = useMemo(() => {
    const collections = store.getCollections();
    const documents = store.getDocuments();
    return collections
      .filter(c => c.id !== 'COL-CUSTOMER')
      .map(col => {
        const docs = documents.filter(d => d.collectionId === col.id && !d.isArchived);
        return {
          id: col.id,
          name: col.name,
          description: col.description,
          count: docs.length,
          items: docs.map(d => ({ slug: d.slug, title: d.title, collectionId: d.collectionId })),
        };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { 'COL-DOCS': 0, 'COL-PUBLIC': 1, 'COL-LEGAL': 2, 'COL-CUSTOMER': 3, 'COL-INTERNAL': 4 };
        return (order[a.id] ?? 99) - (order[b.id] ?? 99);
      });
  }, []);

  return (
    <PRDocsSidebar
      groups={groups}
      selectedSlug={selectedSlug}
      onSelect={onSelect}
      searchQuery={searchQuery}
      onSearch={setSearchQuery}
      isAuthenticated={isAuthenticated}
      className="h-full"
    />
  );
}
