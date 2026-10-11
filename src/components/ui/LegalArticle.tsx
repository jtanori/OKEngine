// PR-LEGAL-ARTICLE — Legal article with version badge, effective date, max-w-3xl, quiet technical
import React from 'react';

export interface LegalArticleProps {
  title: string;
  effectiveDate?: string;
  version?: string;
  content: string;
  className?: string;
}

export function LegalArticle({ title, effectiveDate, version, content, className = '' }: LegalArticleProps) {
  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <div className="flex flex-col gap-3 border-b border-line pb-6">
        <h1 className="text-section font-semibold tracking-tight text-ink-strong">{title}</h1>
        <div className="flex flex-wrap gap-3 text-2xs text-ink-muted">
          {effectiveDate && <span>Vigente desde {new Date(effectiveDate).toLocaleDateString('es-ES')}</span>}
          {version && <span className="inline-flex items-center rounded-xs bg-elevated border border-line px-1.5 py-0.5">{version}</span>}
          <span>Última revisión {new Date().toLocaleDateString('es-ES')}</span>
        </div>
      </div>
      <div className="prose prose-sm max-w-none text-sm text-ink leading-relaxed whitespace-pre-wrap">{content}</div>
      <div className="border-t border-line pt-6 text-2xs text-ink-muted flex flex-col gap-1">
        <div>Este documento puede actualizarse. Te notificaremos cambios materiales.</div>
        <div>Contacto legal: legal@okeng.dev</div>
      </div>
    </div>
  );
}
