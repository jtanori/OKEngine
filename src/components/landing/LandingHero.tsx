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
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-subtle border border-line px-3 py-1 text-2xs font-medium text-accent w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
            Nuevo: Widget que parece tuyo
          </div>
          <h1 className="text-hero font-bold tracking-tight text-ink-strong leading-[1.05]">
            Capa de conocimiento para tu producto
          </h1>
          <p className="text-lg text-ink-secondary leading-relaxed">
            Convierte tu documentación en respuestas con citas, dentro de tu app. Sin alucinaciones, con permisos por rol.
          </p>
          <p className="text-sm text-ink-muted">
            Empieza gratis con 1.000 consultas/mes. Sin tarjeta. Cancela cuando quieras.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/signup"
              onClick={onPrimaryCta}
              className="inline-flex items-center justify-center rounded-sm bg-ink text-surface px-6 py-2.5 text-sm font-medium hover:bg-ink-strong transition-colors"
            >
              Empieza gratis
            </a>
            <a
              href="#como-funciona"
              onClick={onSecondaryCta}
              className="inline-flex items-center justify-center rounded-sm border border-line bg-surface text-ink px-6 py-2.5 text-sm font-medium hover:bg-elevated transition-colors"
            >
              Ver cómo funciona
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="inline-flex items-center rounded-xs bg-success-subtle border border-line px-2 py-1 text-2xs font-medium text-success">≥98% con cita</span>
            <span className="inline-flex items-center rounded-xs bg-elevated border border-line px-2 py-1 text-2xs font-medium text-ink-secondary">Permisos por rol</span>
            <span className="inline-flex items-center rounded-xs bg-elevated border border-line px-2 py-1 text-2xs font-medium text-ink-secondary">Markdown, PDF y web</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <div className="flex -space-x-2">
              <div className="h-6 w-6 rounded-full bg-elevated border border-surface"></div>
              <div className="h-6 w-6 rounded-full bg-subtle border border-surface"></div>
              <div className="h-6 w-6 rounded-full bg-line border border-surface"></div>
            </div>
            <span>Más de 1.200 equipos confían</span>
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
