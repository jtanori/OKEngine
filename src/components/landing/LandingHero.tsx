// CO-LANDING-HERO — Hero pixel-matched to Left target (arena.site)
// Left: pill "Capa de conocimiento..." · H1 Convierte tu documentación en <violet underline>respuestas con citas,</violet> dentro de tu app. · p indexa Markdown/PDF/web · CTAs · helper · badges ≥98% / Permisos / Markdown
// Right: ChatMock target rehearsal (single Q ¿Cómo configuro SSO?)
// Grid lg:[1.1fr_0.9fr] gap-12, leading [0.95] per spec v3.7
import React from 'react';
import { ChatMock } from '../ui/ChatMock';

export interface LandingHeroProps {
  onPrimaryCta?: () => void;
  onSecondaryCta?: () => void;
}

export function LandingHero({ onPrimaryCta, onSecondaryCta }: LandingHeroProps) {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-16 md:py-20">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-12 items-center">
        {/* Left copy */}
        <div className="flex flex-col gap-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-subtle border border-accent/10 px-3 py-1.5 text-xs font-medium text-ink-secondary w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Capa de conocimiento para tu producto
          </div>

          <h1 className="text-hero font-bold tracking-tight text-ink-strong leading-[0.95]">
            Convierte tu documentación en{' '}
            <span className="text-accent-violet underline decoration-accent-violet/30 decoration-2 underline-offset-4">respuestas con citas,</span>{' '}
            dentro de tu app.
          </h1>

          <p className="text-lg text-ink-secondary leading-relaxed max-w-xl">
            OKEng indexa tu Markdown, PDF y web, respeta los permisos por colección y devuelve respuestas verificables. Tus usuarios preguntan y obtienen la fuente, sin salir de tu producto.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="/signup"
              onClick={onPrimaryCta}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink-strong text-white px-6 py-3 text-sm font-semibold shadow-md hover:bg-ink transition-colors"
            >
              Empieza gratis <span aria-hidden>→</span>
            </a>
            <a
              href="#como-funciona"
              onClick={onSecondaryCta}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface text-ink px-6 py-3 text-sm font-medium hover:bg-elevated transition-colors"
            >
              <span className="w-4 h-4 rounded-full border border-line flex items-center justify-center text-2xs">▶</span> Ver cómo funciona
            </a>
          </div>

          <p className="text-xs text-ink-muted">Gratis hasta 1.000 consultas al mes · Sin tarjeta de crédito · Listo en 5 minutos</p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-line px-3 py-1.5 text-xs font-medium text-ink-secondary shadow-sm"
              title="Hasta 98% con cita según pruebas internas con contenido bien estructurado"
            >
              <span className="w-4 h-4 rounded-full bg-success-subtle border border-success/20 flex items-center justify-center text-2xs text-success">✓</span>{' '}
              ≥98% de respuestas con cita*
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-line px-3 py-1.5 text-xs font-medium text-ink-secondary shadow-sm">
              <span className="w-4 h-4 rounded-full bg-subtle border border-line flex items-center justify-center text-2xs">🛡</span> Permisos por colección
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-line px-3 py-1.5 text-xs font-medium text-ink-secondary shadow-sm">
              <span className="w-4 h-4 rounded-full bg-subtle border border-line flex items-center justify-center text-2xs">▭</span> Markdown, PDF y web
            </span>
          </div>
          <p className="text-2xs text-ink-muted">* Con contenido bien estructurado y permisos configurados. Ver docs para metodología.</p>
        </div>

        {/* Right mock — target fidelity */}
        <div className="relative lg:pl-2">
          <ChatMock className="w-full max-w-md mx-auto shadow-xl rounded-xl" />
          {/* tooltip like target absolute */}
          <div className="absolute -bottom-3 -right-2 hidden md:inline-flex items-center gap-2 bg-surface border border-line rounded-full shadow-md px-3 py-1.5 text-2xs font-medium text-ink-secondary">
            <span className="font-mono text-2xs">{'</>'}</span> 3 líneas de código
            <span className="text-ink-muted font-normal hidden lg:inline">· iframe, React o API</span>
          </div>
        </div>
      </div>
    </section>
  );
}
