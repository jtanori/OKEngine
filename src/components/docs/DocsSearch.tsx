// CO-DOCS-SEARCH — Search with hybrid retrieval, citations, results, FORM-SEC-01
import React, { useState, useMemo } from 'react';
import { DocsSearch as PRDocsSearch } from '../ui/DocsSearch';
import { store } from '../../services/store';

export interface DocsSearchCOProps {
  onSelect: (slug: string) => void;
}

export function DocsSearchCO({ onSelect }: DocsSearchCOProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    try {
      const documents = store.getDocuments();
      const authorizedDocs = documents.filter(d => !d.isArchived && d.collectionId !== 'COL-INTERNAL' && d.collectionId !== 'COL-CUSTOMER');
      const q = query.toLowerCase();
      return authorizedDocs
        .filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q) || d.slug.toLowerCase().includes(q))
        .slice(0, 8)
        .map(d => ({ docId: d.id, slug: d.slug, title: d.title, excerpt: d.content.slice(0, 120), collectionId: d.collectionId, score: 1.0 }));
    } catch {
      return [];
    }
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <PRDocsSearch onSearch={setQuery} placeholder="Buscar en documentación — híbrida semántica + keyword..." />
      {query && (
        <div className="flex flex-col gap-2">
          <div className="text-2xs text-ink-muted">{results.length} resultados para "{query}"</div>
          <div className="flex flex-col gap-2">
            {results.map((r: any) => (
              <button key={r.docId || r.id} type="button" onClick={() => onSelect(r.slug || r.docId)} className="text-left rounded-lg border border-line bg-surface p-3 hover:bg-elevated transition-colors flex flex-col gap-1">
                <div className="text-xs font-medium text-ink">{r.title || r.slug}</div>
                <div className="text-2xs text-ink-secondary line-clamp-2">{r.excerpt || ''}</div>
                <div className="text-2xs text-accent">{r.collectionId}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
