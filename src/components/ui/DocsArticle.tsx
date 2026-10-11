// PR-DOCS-ARTICLE — Article container with max-w-3xl prose, TOC, toolbar, version badge, related docs
import React from 'react';

export interface DocsArticleProps {
  title: string;
  content: string;
  updatedAt?: string;
  knowledgeVersion?: number;
  collectionName?: string;
  onEdit?: () => void;
  relatedDocs?: Array<{ slug: string; title: string }>;
  onSelectRelated?: (slug: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export function DocsArticle({ title, content, updatedAt, knowledgeVersion, collectionName, onEdit, relatedDocs, onSelectRelated, children, className = '' }: DocsArticleProps) {
  return (
    <article className={`max-w-3xl mx-auto flex flex-col gap-6 ${className}`}>
      <div className="flex flex-col gap-3">
        {collectionName && <div className="text-2xs font-medium uppercase tracking-wider text-ink-muted">{collectionName}</div>}
        <h1 className="text-section font-semibold tracking-tight text-ink-strong">{title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-2xs text-ink-muted">
          {updatedAt && <span>Actualizado {new Date(updatedAt).toLocaleDateString('es-ES')}</span>}
          {knowledgeVersion && <span className="inline-flex items-center rounded-xs bg-elevated border border-line px-1.5 py-0.5">v{knowledgeVersion}</span>}
          {onEdit && <button type="button" onClick={onEdit} className="text-accent hover:underline">Editar esta página</button>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="text-xs text-ink-secondary hover:text-ink border border-line rounded-sm px-2 py-1 bg-surface hover:bg-elevated">Copiar</button>
          <button type="button" className="text-xs text-ink-secondary hover:text-ink border border-line rounded-sm px-2 py-1 bg-surface hover:bg-elevated">Compartir</button>
          <button type="button" className="text-xs text-ink-secondary hover:text-ink border border-line rounded-sm px-2 py-1 bg-surface hover:bg-elevated">Ver fuente</button>
        </div>
      </div>
      <div className="prose prose-sm max-w-none text-sm text-ink leading-relaxed">
        {/* Deterministic rendering — in real implementation would use CO-CONTENT-RENDERER with Normalized Content AST */}
        <div className="whitespace-pre-wrap">{content.slice(0, 2000)}{content.length > 2000 ? '...' : ''}</div>
      </div>
      {children}
      {relatedDocs && relatedDocs.length > 0 && (
        <div className="border-t border-line pt-6 flex flex-col gap-3">
          <div className="text-xs font-semibold text-ink">Relacionado</div>
          <div className="flex flex-col gap-1">
            {relatedDocs.map(doc => (
              <button key={doc.slug} type="button" onClick={() => onSelectRelated?.(doc.slug)} className="text-left text-xs text-accent hover:underline">
                → {doc.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="border-t border-line pt-6 flex flex-col gap-2">
        <div className="text-xs font-medium text-ink">¿Te fue útil?</div>
        <div className="flex items-center gap-2">
          <button type="button" className="h-8 w-8 rounded-sm border border-line bg-surface hover:bg-elevated flex items-center justify-center text-sm">👍</button>
          <button type="button" className="h-8 w-8 rounded-sm border border-line bg-surface hover:bg-elevated flex items-center justify-center text-sm">👎</button>
          <span className="text-2xs text-ink-muted ml-2">Feedback anónimo • Mejora continua</span>
        </div>
      </div>
    </article>
  );
}
