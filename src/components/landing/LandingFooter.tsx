// CO-LANDING-FOOTER — Footer 4 columns + bottom
import React from 'react';

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-line bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-ink">Producto</div>
          <a href="#producto" className="text-xs text-ink-secondary hover:text-ink">Características</a>
          <a href="#integracion" className="text-xs text-ink-secondary hover:text-ink">Integración</a>
          <a href="#precios" className="text-xs text-ink-secondary hover:text-ink">Precios</a>
          <a href="/changelog" className="text-xs text-ink-secondary hover:text-ink">Changelog</a>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-ink">Desarrolladores</div>
          <a href="/docs" className="text-xs text-ink-secondary hover:text-ink">Docs</a>
          <a href="/api" className="text-xs text-ink-secondary hover:text-ink">API</a>
          <a href="/sdks" className="text-xs text-ink-secondary hover:text-ink">SDKs</a>
          <a href="/status" className="text-xs text-ink-secondary hover:text-ink">Estado</a>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-ink">Empresa</div>
          <a href="/about" className="text-xs text-ink-secondary hover:text-ink">Sobre</a>
          <a href="/blog" className="text-xs text-ink-secondary hover:text-ink">Blog</a>
          <a href="/contact" className="text-xs text-ink-secondary hover:text-ink">Contacto</a>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-ink">Legal</div>
          <a href="/terms" className="text-xs text-ink-secondary hover:text-ink">Términos</a>
          <a href="/privacy" className="text-xs text-ink-secondary hover:text-ink">Privacidad</a>
          <a href="/acceptable-use" className="text-xs text-ink-secondary hover:text-ink">Uso aceptable</a>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-ink-muted">© {new Date().getFullYear()} OKEng. Todos los derechos reservados.</div>
          <div className="flex items-center gap-4 text-xs text-ink-muted">
            <span>ES / EN</span>
            <span>•</span>
            <span>Hecho con quiet technical</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
