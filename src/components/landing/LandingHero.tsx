// CO-LANDING-HERO — Hero split left copy + right chat mock
// Composition: PR-BOX + PR-TEXT + PR-BUTTON + PR-CHAT-MOCK + PR-BADGE + PR-METRIC
import React from 'react';
import { ChatMock } from '../ui/ChatMock';

export interface LandingHeroProps {
  onPrimaryCta?: () => void;
  onSecondaryCta?: () => void;
}

export function LandingHero({ onPrimaryCta, onSecondaryCta }: LandingHeroProps) {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-surface border border-line px-3 py-1 text-2xs font-medium text-accent w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
            Capa de conocimiento para tu producto
          </div>
          <h1 className="text-hero font-bold tracking-tight text-ink-strong leading-[1.05]">
            Convierte tu documentación en <span className="text-accent underline decoration-2 underline-offset-4">respuestas con citas,</span> dentro de tu app.
          </h1>
          <p className="text-lg text-ink-secondary leading-relaxed">
            OKEng indexa tu Markdown, PDF y web, respeta los permisos por colección y devuelve respuestas verificables. Tus usuarios preguntan y obtienen la fuente, sin salir de tu producto.
          </p>
          <p className="text-xs text-ink-muted">Gratis hasta 1.000 consultas al mes · Sin tarjeta de crédito · Listo en 5 minutos</p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/signup"
              onClick={onPrimaryCta}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent text-surface px-6 py-3 text-sm font-semibold shadow-lg shadow-accent/20 hover:bg-accent-hover transition-colors"
            >
              Empieza gratis <span>→</span>
            </a>
            <a
              href="#como-funciona"
              onClick={onSecondaryCta}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface text-ink px-6 py-3 text-sm font-medium hover:bg-elevated transition-colors"
            >
              <span className="w-4 h-4 rounded-full border border-line flex items-center justify-center text-2xs">◉</span> Ver cómo funciona
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1 rounded-xs bg-surface border border-line px-2 py-1 text-2xs font-medium text-ink-secondary">
              <span className="text-success">✓</span> ≥98% de respuestas con cita
            </span>
            <span className="inline-flex items-center gap-1 rounded-xs bg-surface border border-line px-2 py-1 text-2xs font-medium text-ink-secondary">
              <span>🛡</span> Permisos por colección
            </span>
            <span className="inline-flex items-center gap-1 rounded-xs bg-surface border border-line px-2 py-1 text-2xs font-medium text-ink-secondary">
              <span>📄</span> Markdown, PDF y web
            </span>
          </div>
        </div>
        <div className="relative">
          <ChatMock className="w-full max-w-md mx-auto shadow-lg rounded-lg" />
          <div className="absolute -bottom-4 -right-4 bg-surface border border-line rounded-sm shadow-sm px-3 py-1.5 text-2xs text-ink-secondary hidden md:flex items-center gap-2">
            <span className="h-2 w-2 bg-success rounded-full"></span>3 líneas de código
          </div>
        </div>
      </div>
    </section>
  );
}
