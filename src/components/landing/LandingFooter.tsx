// CO-LANDING-FOOTER — Footer 4 columns + bottom dark
import React from 'react';

export function LandingFooter() {
  return (
    <footer className="w-full bg-ink-strong">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white text-2xs font-bold">OK</div>
            <span className="text-sm font-semibold text-white">OKEng</span>
          </div>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs">La capa de conocimiento que convierte tu documentación en respuestas verificables, dentro de tu aplicación.</p>
          <div className="flex items-center gap-2">
            <a href="https://github.com" aria-label="GitHub" className="w-8 h-8 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-colors">
              <span className="text-2xs">◉</span>
            </a>
            <a href="https://x.com" aria-label="X" className="w-8 h-8 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-colors">
              <span className="text-2xs">✕</span>
            </a>
            <a href="https://linkedin.com" aria-label="LinkedIn" className="w-8 h-8 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-colors">
              <span className="text-2xs">in</span>
            </a>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/20 px-3 py-1 text-2xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Todos los sistemas operativos
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-2xs font-semibold tracking-[0.2em] uppercase text-white">Producto</div>
          <a href="#producto" className="text-sm text-white/60 hover:text-white leading-7">Widget embebible</a>
          <a href="/api" className="text-sm text-white/60 hover:text-white leading-7">API y SDKs</a>
          <a href="#integracion" className="text-sm text-white/60 hover:text-white leading-7">Integraciones</a>
          <a href="#permisos" className="text-sm text-white/60 hover:text-white leading-7">Permisos y seguridad</a>
          <a href="#precios" className="text-sm text-white/60 hover:text-white leading-7">Precios</a>
          <a href="/changelog" className="text-sm text-white/60 hover:text-white leading-7">Novedades</a>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-2xs font-semibold tracking-[0.2em] uppercase text-white">Recursos</div>
          <a href="/docs" className="text-sm text-white/60 hover:text-white leading-7">Documentación</a>
          <a href="/docs" className="text-sm text-white/60 hover:text-white leading-7">Guías de inicio</a>
          <a href="/api" className="text-sm text-white/60 hover:text-white leading-7">Referencia de la API</a>
          <a href="/docs" className="text-sm text-white/60 hover:text-white leading-7">Plantillas de prompts</a>
          <a href="/status" className="text-sm text-white/60 hover:text-white leading-7">Estado del servicio</a>
          <a href="/changelog" className="text-sm text-white/60 hover:text-white leading-7">Changelog</a>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-2xs font-semibold tracking-[0.2em] uppercase text-white">Empresa</div>
          <a href="/about" className="text-sm text-white/60 hover:text-white leading-7">Acerca de</a>
          <a href="/blog" className="text-sm text-white/60 hover:text-white leading-7">Blog</a>
          <a href="/about" className="text-sm text-white/60 hover:text-white leading-7">Empleo</a>
          <a href="/about" className="text-sm text-white/60 hover:text-white leading-7">Clientes</a>
          <a href="/contact" className="text-sm text-white/60 hover:text-white leading-7">Contacto</a>
          <a href="/about" className="text-sm text-white/60 hover:text-white leading-7">Marca</a>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-2xs font-semibold tracking-[0.2em] uppercase text-white">Legal</div>
          <a href="/privacy" className="text-sm text-white/60 hover:text-white leading-7">Privacidad</a>
          <a href="/terms" className="text-sm text-white/60 hover:text-white leading-7">Términos</a>
          <a href="/privacy" className="text-sm text-white/60 hover:text-white leading-7">Seguridad</a>
          <a href="/terms" className="text-sm text-white/60 hover:text-white leading-7">DPA / RGPD</a>
          <a href="/privacy" className="text-sm text-white/60 hover:text-white leading-7">Cookies</a>
          <a href="/terms" className="text-sm text-white/60 hover:text-white leading-7">Subencargados</a>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-white/40">© {new Date().getFullYear()} OKEng. Todos los derechos reservados.</div>
          <div className="text-xs text-white/40">Hecho con quiet technical</div>
        </div>
      </div>
    </footer>
  );
}
