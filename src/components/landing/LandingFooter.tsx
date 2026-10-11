// CO-LANDING-FOOTER — Footer 4 columns + bottom (dark like target)
import React from 'react';

export function LandingFooter() {
  return (
    <footer className="w-full bg-ink-strong border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-white">Producto</div>
          <a href="#producto" className="text-xs text-white/60 hover:text-white">Características</a>
          <a href="#integracion" className="text-xs text-white/60 hover:text-white">Integración</a>
          <a href="#precios" className="text-xs text-white/60 hover:text-white">Precios</a>
          <a href="/changelog" className="text-xs text-white/60 hover:text-white">Changelog</a>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-white">Desarrolladores</div>
          <a href="/docs" className="text-xs text-white/60 hover:text-white">Docs</a>
          <a href="/api" className="text-xs text-white/60 hover:text-white">API</a>
          <a href="/sdks" className="text-xs text-white/60 hover:text-white">SDKs</a>
          <a href="/status" className="text-xs text-white/60 hover:text-white">Estado</a>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-white">Empresa</div>
          <a href="/about" className="text-xs text-white/60 hover:text-white">Sobre</a>
          <a href="/blog" className="text-xs text-white/60 hover:text-white">Blog</a>
          <a href="/contact" className="text-xs text-white/60 hover:text-white">Contacto</a>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-white">Legal</div>
          <a href="/terms" className="text-xs text-white/60 hover:text-white">Términos</a>
          <a href="/privacy" className="text-xs text-white/60 hover:text-white">Privacidad</a>
          <a href="/acceptable-use" className="text-xs text-white/60 hover:text-white">Uso aceptable</a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-white/50">© {new Date().getFullYear()} OKEng. Todos los derechos reservados.</div>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>ES / EN</span>
            <span>•</span>
            <span>Hecho con quiet technical</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
