// CO-PUBLIC-LEGAL — Legal page PA-PUBLIC: deterministic article + EMB-PUBLIC-LEGAL assistant, max-w-3xl centered py-16/24 editorial
import React, { useMemo } from 'react';
import { AnnouncementBanner } from '../ui/AnnouncementBanner';
import { LandingFooter } from '../landing/LandingFooter';
import { ContentRenderer } from '../../content/renderer/content-renderer';
import { store } from '../../services/store';
import { DogfoodInlineBot } from './DogfoodInlineBot';
import { DocsAsk } from '../ui/DocsAsk';

export interface LegalViewProps {
  slug: 'terms' | 'privacy' | 'acceptable-use';
}

export function LegalView({ slug }: LegalViewProps) {
  const documents = store.getDocuments();
  const workspace = store.getWorkspace();
  const doc = useMemo(() => documents.find(d => d.slug === slug), [documents, slug]);

  const titleMap: Record<string, string> = {
    terms: 'Términos de Servicio',
    privacy: 'Política de Privacidad',
    'acceptable-use': 'Uso Aceptable',
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AnnouncementBanner>Citas verificables y permisos por rol — ≥98% con cita, sin alucinaciones</AnnouncementBanner>
      <header className="w-full border-b border-line bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-sm bg-ink text-surface flex items-center justify-center text-2xs font-bold">O</div>
              <span className="text-sm font-semibold">OKEng</span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-xs text-ink-secondary">
              <a href="/#producto" className="hover:text-ink">Producto</a>
              <a href="/#integracion" className="hover:text-ink">Integración</a>
              <a href="/#precios" className="hover:text-ink">Precios</a>
              <a href="/docs" className="hover:text-ink">Docs</a>
              <a href="/#faq" className="hover:text-ink">FAQ</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-xs font-medium text-ink-secondary hover:text-ink px-3 py-1.5">Iniciar sesión</a>
            <a href="/signup" className="inline-flex items-center justify-center rounded-sm bg-ink text-surface px-4 py-1.5 text-xs font-medium hover:bg-ink-strong">Empieza gratis</a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24 flex flex-col gap-8">
        <div className="flex flex-col gap-3 border-b border-line pb-6">
          <div className="text-2xs font-medium uppercase tracking-wider text-ink-muted">Legal • {slug}</div>
          <h1 className="text-section font-semibold tracking-tight text-ink-strong">{titleMap[slug] || slug}</h1>
          <div className="flex flex-wrap gap-3 text-2xs text-ink-muted">
            <span>Vigente desde {doc ? new Date(doc.updatedAt).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')}</span>
            <span className="inline-flex items-center rounded-xs bg-elevated border border-line px-1.5 py-0.5">v{workspace?.knowledgeVersion ?? '—'}</span>
            <span>Contacto legal: legal@okeng.dev</span>
          </div>
        </div>

        {doc ? (
          <ContentRenderer content={doc.content} context="PUBLIC_DOC" />
        ) : (
          <div className="text-sm text-ink-secondary">Documento legal no encontrado: {slug}</div>
        )}

        <div className="border-t border-line pt-8 flex flex-col gap-4">
          <div className="text-xs font-semibold text-ink">Preguntar sobre este documento legal</div>
          <DocsAsk currentDocSlug={slug} currentUrl={`/${slug}`} collectionIds={['COL-LEGAL']} />
          <div className="rounded-lg border border-line bg-surface p-1">
            <DogfoodInlineBot embedId="EMB-PUBLIC-LEGAL" currentUrl={`/${slug}`} collectionIds={['COL-LEGAL']} />
          </div>
        </div>

        <div className="border-t border-line pt-6 text-2xs text-ink-muted flex flex-col gap-1">
          <div>Este documento puede actualizarse. Te notificaremos cambios materiales por email.</div>
          <div>EU hosting • 0 datos usados para entrenamiento • BYOK • Citas verificables</div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
