// PR-DOCS-HEADER — Minimal header for docs with logo + nav + search + CTAs + announcement banner
import React from 'react';
import { AnnouncementBanner } from './AnnouncementBanner';

export interface DocsHeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
  className?: string;
}

export function DocsHeader({ onSearch, searchQuery = '', className = '' }: DocsHeaderProps) {
  return (
    <div className={`w-full ${className}`}>
      <AnnouncementBanner>Citas verificables y permisos por rol — ≥98% con cita, sin alucinaciones</AnnouncementBanner>
      <header className="w-full border-b border-line bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-sm bg-ink text-surface flex items-center justify-center text-2xs font-bold">O</div>
              <span className="text-sm font-semibold text-ink">OKEng</span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-xs text-ink-secondary">
              <a href="/#producto" className="hover:text-ink">Producto</a>
              <a href="/#integracion" className="hover:text-ink">Integración</a>
              <a href="/#precios" className="hover:text-ink">Precios</a>
              <a href="/docs" className="text-ink font-medium">Docs</a>
              <a href="/#faq" className="hover:text-ink">FAQ</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {onSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearch(e.target.value)}
                placeholder="Buscar docs..."
                className="hidden md:block h-8 w-48 rounded-sm border border-line bg-elevated px-3 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-subtle focus:border-accent"
              />
            )}
            <a href="/login" className="text-xs font-medium text-ink-secondary hover:text-ink px-3 py-1.5">Iniciar sesión</a>
            <a href="/signup" className="inline-flex items-center justify-center rounded-sm bg-ink text-surface px-4 py-1.5 text-xs font-medium hover:bg-ink-strong">Empieza gratis</a>
          </div>
        </div>
      </header>
    </div>
  );
}
