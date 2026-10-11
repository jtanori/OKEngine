// CO-DOCS-ARTICLE — Article with deterministic rendering, TOC, toolbar Copy Share Edit, version badge, history, related docs, next-step, feedback
import React, { useMemo, useState } from 'react';
import { ContentRenderer } from '../../content/renderer/content-renderer';
import { store } from '../../services/store';
import { authService } from '../../services/auth';
import { SourceList } from '../SourceList';
import { NextStepButton } from '../NextStepButton';
import { FeedbackControl } from '../FeedbackControl';
import { DocsToc, TocItem } from '../ui/DocsToc';
import { DocsAsk } from '../ui/DocsAsk';

export interface DocsArticleCOProps {
  slug: string;
  onNavigate?: (path: string) => void;
}

export function DocsArticleCO({ slug, onNavigate }: DocsArticleCOProps) {
  const documents = store.getDocuments();
  const workspace = store.getWorkspace();
  const doc = documents.find(d => d.slug === slug);
  const [showRaw, setShowRaw] = useState(false);
  const user = authService.getCurrentUser();

  const tocItems: TocItem[] = useMemo(() => {
    if (!doc) return [];
    const lines = doc.content.split('\n');
    const items: TocItem[] = [];
    lines.forEach(line => {
      const m = line.match(/^(##|###)\s+(.*)/);
      if (m) {
        const level = m[1].length as 2 | 3;
        const text = m[2].trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        items.push({ id, text, level });
      }
    });
    return items;
  }, [doc]);

  const relatedDocs = useMemo(() => {
    if (!doc) return [];
    return documents
      .filter(d => d.collectionId === doc.collectionId && d.slug !== doc.slug && !d.isArchived)
      .slice(0, 4)
      .map(d => ({ slug: d.slug, title: d.title }));
  }, [documents, doc]);

  const [activeTocId, setActiveTocId] = useState<string | undefined>(undefined);

  if (!doc) {
    return (
      <div className="max-w-3xl mx-auto py-12 flex flex-col gap-4">
        <div className="text-sm text-ink-secondary">Documento no encontrado: {slug}</div>
        <button type="button" onClick={() => onNavigate?.('/docs')} className="text-xs text-accent hover:underline self-start">← Volver a docs</button>
      </div>
    );
  }

  const isInternal = doc.collectionId === 'COL-INTERNAL';
  const canEdit = !!user && isInternal;
  const collectionName = doc.collectionId.replace('COL-', '');

  return (
    <div className="flex gap-8">
      <article className="flex-1 max-w-3xl flex flex-col gap-6 min-w-0">
        <div className="flex flex-col gap-3">
          <div className="text-2xs font-medium uppercase tracking-wider text-ink-muted">{collectionName} • {doc.collectionId}</div>
          <h1 className="text-section font-semibold tracking-tight text-ink-strong">{doc.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-2xs text-ink-muted">
            <span>Actualizado {new Date(doc.updatedAt).toLocaleDateString('es-ES')}</span>
            <span className="inline-flex items-center rounded-xs bg-elevated border border-line px-1.5 py-0.5">v{workspace?.knowledgeVersion ?? '—'}</span>
            {doc.frontmatter?.next_step && <span>→ {doc.frontmatter.next_step}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => navigator.clipboard.writeText(doc.content)} className="text-xs text-ink-secondary hover:text-ink border border-line rounded-sm px-2 py-1 bg-surface hover:bg-elevated">Copiar MD</button>
            <button type="button" onClick={() => navigator.clipboard.writeText(window.location.href)} className="text-xs text-ink-secondary hover:text-ink border border-line rounded-sm px-2 py-1 bg-surface hover:bg-elevated">Compartir</button>
            <button type="button" onClick={() => setShowRaw(v => !v)} className="text-xs text-ink-secondary hover:text-ink border border-line rounded-sm px-2 py-1 bg-surface hover:bg-elevated">{showRaw ? 'Ver render' : 'Ver fuente'}</button>
            {canEdit && <button type="button" onClick={() => onNavigate?.(`/workspaces/okeng/files/${doc.id}`)} className="text-xs text-accent hover:underline border border-line rounded-sm px-2 py-1 bg-surface">Editar esta página</button>}
          </div>
        </div>

        {showRaw ? (
          <pre className="rounded-lg border border-line bg-elevated p-4 text-xs text-ink overflow-x-auto whitespace-pre-wrap">{doc.content}</pre>
        ) : (
          <ContentRenderer content={doc.content} context="PUBLIC_DOC" />
        )}

        {doc.frontmatter?.next_step && (
          <div className="border-t border-line pt-6">
            <NextStepButton label="Siguiente paso" url={doc.frontmatter.next_step} variant="primary" />
          </div>
        )}

        <div className="border-t border-line pt-6 flex flex-col gap-3">
          <div className="text-xs font-semibold text-ink">Preguntar sobre esta página</div>
          <DocsAsk currentDocSlug={doc.slug} currentUrl={`/docs/${doc.slug}`} collectionIds={[doc.collectionId]} />
        </div>

        {relatedDocs.length > 0 && (
          <div className="border-t border-line pt-6 flex flex-col gap-3">
            <div className="text-xs font-semibold text-ink">Relacionado</div>
            <div className="flex flex-col gap-1">
              {relatedDocs.map(rd => (
                <button key={rd.slug} type="button" onClick={() => onNavigate?.(`/docs/${rd.slug}`)} className="text-left text-xs text-accent hover:underline">→ {rd.title}</button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-line pt-6 flex flex-col gap-3">
          <div className="text-xs font-medium text-ink">¿Te fue útil?</div>
          <div className="flex items-center gap-2">
            <FeedbackControl documentId={doc.id} />
            <span className="text-2xs text-ink-muted ml-2">Feedback anónimo • Mejora continua • knowledgeVersion {workspace?.knowledgeVersion}</span>
          </div>
        </div>
      </article>

      {tocItems.length >= 2 && (
        <div className="hidden lg:block w-[200px] shrink-0">
          <div className="sticky top-24">
            <DocsToc items={tocItems} activeId={activeTocId} onSelect={id => {
              setActiveTocId(id);
              const el = document.getElementById(id);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
