// CO-PUBLIC-ABOUT — About page PA-PUBLIC: product overview, capabilities, team, metrics, trust badges, editorial whitespace max-w-7xl py-16/24
import React from 'react';
import { AnnouncementBanner } from '../ui/AnnouncementBanner';
import { LandingFooter } from '../landing/LandingFooter';

export function AboutView() {
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

      <main className="max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col gap-16">
        <div className="max-w-3xl flex flex-col gap-6">
          <div className="text-2xs font-medium uppercase tracking-wider text-ink-muted">Sobre OKEng</div>
          <h1 className="text-display font-semibold tracking-tight text-ink-strong">OKEng — Tu documentación, respondiendo dentro de tu app</h1>
          <p className="text-body text-ink-secondary">OKEng convierte tu documentación en respuestas con citas verificables, dentro de tu app. Sin alucinaciones. Con permisos por rol. Dogfooding real: este sitio es ws_okeng_01 con 5 colecciones, 25 docs, 3 embeds. Determinístico para artículos, dinámico para respuestas.</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">Citas verificables</span>
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">Permisos por rol</span>
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">≥98% con cita</span>
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">-73% tickets</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-3 shadow-sm">
            <div className="text-sm font-semibold text-ink">Capa de conocimiento</div>
            <div className="text-xs text-ink-secondary leading-relaxed">Markdown primero, heading-aware chunking, line-range tracking, knowledgeVersion cache invalidation. Tu docs → chunks → retrieval → citas.</div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-3 shadow-sm">
            <div className="text-sm font-semibold text-ink">Permisos reales</div>
            <div className="text-xs text-ink-secondary leading-relaxed">3-tier visibility everyone/members/admins, EffectiveScope B∩R pre-retrieval, HMAC-SHA256 signed host identity, 4-case token boundary. Sin bypass.</div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-3 shadow-sm">
            <div className="text-sm font-semibold text-ink">Citas que verifican</div>
            <div className="text-xs text-ink-secondary leading-relaxed">Cada respuesta con fuentes verificadas docId title filename collectionId url citationRenderMode. ServerOutcome grounded|refused|failed. 0 fabricadas.</div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <h2 className="text-section font-semibold tracking-tight text-ink-strong">Cómo lo construimos — dogfooding</h2>
          <div className="grid md:grid-cols-2 gap-8 text-sm text-ink-secondary leading-relaxed">
            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold text-ink">Workspace ws_okeng_01</div>
              <div>5 colecciones: COL-PUBLIC everyone 4 docs producto, COL-DOCS everyone 11 docs guías, COL-LEGAL everyone 3 docs legal, COL-CUSTOMER members 3 docs auth-context-integration, COL-INTERNAL admins 4 docs ops. 25 docs Markdown con frontmatter next_step translations.es.</div>
              <div>3 embeds: EMB-PUBLIC-HOME mixed-access showcase 5 colecciones floating tour Demo Settings Drawer Identity Visitor/Member/Admin Context / /docs/embedding /docs/access-control pendingSettingsOpId atomic POST /api/demo/homepage-context non-bypassable pre-retrieval 6-point verification EffectiveScope B∩R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY policy-versioned caching demoPolicyVersion+narrowedDocumentFingerprint grounded provenance serverOutcome grounded|refused|failed. EMB-PUBLIC-DOCS public docs only COL-DOCS. EMB-PUBLIC-LEGAL legal only COL-LEGAL.</div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold text-ink">Determinístico vs dinámico</div>
              <div>Determinístico: navegación, layout, legal bodies, doc article bodies render authoritative Markdown source determinísticamente nunca LLM vía DocArticleRenderer + CO-CONTENT-RENDERER Normalized Content AST renderer_version 1. Dinámico: embedded assistants EMB-PUBLIC-HOME EMB-PUBLIC-DOCS EMB-PUBLIC-LEGAL y doc search usan real OKEng retrieval engine resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse con citas y NextStepButton.</div>
              <div>Live update: editar Markdown dentro /workspaces/okeng console o actualizar canonical seed documents INITIAL_DOCUMENTS con newer updatedAt vía store.reconcileCanonicalSeeds inmediatamente actualiza tanto páginas públicas determinísticas como índice retrieval activo mientras bump knowledgeVersion. Test Console reproducibility PAGE-APP-06 cada homepage demo escenario Scenario A Visitor B Member C Admin D Invalid Token 401 E Multilingual ¿Cómo funciona OKEng? puede reproducirse idénticamente dentro /workspaces/okeng/test?embedId=EMB-PUBLIC-HOME.</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-2">
            <div className="text-metric-value font-semibold tracking-tight text-ink-strong">≥98%</div>
            <div className="text-xs text-ink-secondary">Respuestas con cita verificable, no alucinación</div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-2">
            <div className="text-metric-value font-semibold tracking-tight text-ink-strong">-73%</div>
            <div className="text-xs text-ink-secondary">Reducción tickets soporte con respuestas in-app</div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-2">
            <div className="text-metric-value font-semibold tracking-tight text-ink-strong">3 líneas</div>
            <div className="text-xs text-ink-secondary">Código para integrar widget que parece tuyo</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href="/signup" className="inline-flex items-center justify-center rounded-sm bg-ink text-surface px-5 py-2.5 text-sm font-medium hover:bg-ink-strong">Empieza gratis</a>
          <a href="/docs" className="inline-flex items-center justify-center rounded-sm border border-line bg-surface text-ink px-5 py-2.5 text-sm font-medium hover:bg-elevated">Ver docs</a>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
