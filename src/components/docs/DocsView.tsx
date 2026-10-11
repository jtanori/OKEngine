// PA-DOCS — Documentation page archetype v3.0 implementation
import React, { useState } from 'react';
import { DocsLayout } from './DocsLayout';
import { DocsSidebarCO } from './DocsSidebar';
import { DocsArticleCO } from './DocsArticle';
import { DocsSearchCO } from './DocsSearch';
import { store } from '../../services/store';

export interface DocsViewProps {
  initialSlug?: string;
  onNavigatePath?: (path: string) => void;
}

export function DocsView({ initialSlug = 'getting-started', onNavigatePath }: DocsViewProps) {
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [searchQuery, setSearchQuery] = useState('');
  const workspace = store.getWorkspace();

  const handleSelect = (slug: string) => {
    setSelectedSlug(slug);
    if (onNavigatePath) onNavigatePath(`/docs/${slug}`);
    else window.history.pushState({}, '', `/docs/${slug}`);
    window.scrollTo(0, 0);
  };

  return (
    <DocsLayout
      searchQuery={searchQuery}
      onSearch={setSearchQuery}
      sidebar={<DocsSidebarCO selectedSlug={selectedSlug} onSelect={handleSelect} />}
    >
      {searchQuery.trim().length >= 2 ? (
        <div className="max-w-3xl mx-auto w-full">
          <DocsSearchCO onSelect={handleSelect} />
        </div>
      ) : (
        <DocsArticleCO slug={selectedSlug} onNavigate={onNavigatePath} />
      )}

      <div className="max-w-3xl mx-auto w-full border-t border-line pt-8 mt-8 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">Citas verificables</span>
          <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">Permisos por rol</span>
          <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">Sin tarjeta para empezar</span>
          <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">≥98% con cita</span>
          <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">v{workspace?.knowledgeVersion ?? '—'}</span>
        </div>
        <div className="text-2xs text-ink-muted">OKEng usa OKEng — este sitio es ws_okeng_01 con 5 colecciones, 25 docs, 3 embeds. Determinístico para artículos, dinámico para respuestas. Live update via reconcileCanonicalSeeds.</div>
      </div>
    </DocsLayout>
  );
}
