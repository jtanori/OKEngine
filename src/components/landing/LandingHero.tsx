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
          <div className="inline-flex items-center gap-2 rounded-full bg-surface border border-line px-3 py-1 text-2xs font-medium text-ink-secondary w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Capa de conocimiento para tu producto
          </div>

          <h1 className="text-[2.75rem] lg:text-[3.5rem] font-bold tracking-tight text-ink-strong leading-[0.92]">
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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink-strong text-white px-6 py-3 text-sm font-semibold shadow-sm hover:bg-ink transition-colors"
            >
              Empieza gratis <span aria-hidden>→</span>
            </a>
            <a
              href="#como-funciona"
              onClick={onSecondaryCta}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface text-ink px-6 py-3 text-sm font-medium hover:bg-elevated transition-colors"
            >
              <span className="w-4 h-4 rounded-full border border-line flex items-center justify-center text-2xs">▶</span> Ver cómo funciona
            </a>
          </div>

          <p className="text-xs text-ink-muted">Gratis hasta 1.000 consultas al mes · Sin tarjeta de crédito · Listo en 5 minutos</p>

          <div className="flex flex-wrap items-center gap-5 pt-1">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary" title="Hasta 98% con cita según pruebas internas con contenido bien estructurado">
              <span className="text-success text-sm">✓</span> ≥98% de respuestas con cita*
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary">
              <span className="text-sm">🛡</span> Permisos por colección
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary">
              <span className="text-sm">▭</span> Markdown, PDF y web
            </span>
          </div>
          <p className="text-2xs text-ink-muted">* Con contenido bien estructurado y permisos configurados. Ver docs para metodología.</p>
        </div>

        {/* Right mock — target fidelity with glow */}
        <div className="relative lg:pl-2">
          {/* Glow behind card — like Right target */}
          <div className="absolute -inset-6 bg-gradient-to-br from-accent-violet/15 via-accent-indigo/10 to-accent-subtle/60 blur-2xl rounded-3xl pointer-events-none" aria-hidden />
          <ChatMock className="relative w-full max-w-md mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.12),0_8px_20px_rgba(0,0,0,0.08)] rounded-xl" />
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
