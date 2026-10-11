'use client';

// CO-AUTH-SHELL v3.6 — navbar-less flush 52/48 (PA-AUTH v3.6) — replaces CO-AUTH-SPLIT-LAYOUT
// DS tokens: bg-canvas, bg-brand (ink-strong #05081A alias #080B1A), border-line, accent violet/indigo via @theme
// Changes per 2026-10-11: remove header, logo inside left (replaces pill), Volver+Lang top-right inside right, minimal mobile left bar (logo+Volver+Lang), flatten rehearsal, copyright inside left, left 100% height no scroll unless overflow
import React from 'react';
import { LanguageSelector } from '../LanguageSelector';

export interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Mobile minimal left — reduced height, logo + Volver+Lang inline (replaces header on <lg) */}
      <div className="lg:hidden flex items-center justify-between px-4 h-14 bg-brand shrink-0">
        <a href="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-sm bg-white text-brand flex items-center justify-center text-2xs font-bold">OK</div>
          <span className="text-sm font-semibold text-white tracking-tight">
            OK<span className="text-accent-violet-light">Eng</span>
          </span>
        </a>
        <div className="flex items-center gap-3">
          <a href="/" className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white">
            <span aria-hidden>←</span> Volver
          </a>
          <LanguageSelector variant="compact" showIcon={false} />
        </div>
      </div>

      {/* Split body — flush 40/60, no outer margin, left 100% height */}
      <main className="flex-1 w-full flex flex-col min-h-0">
        <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[40fr_60fr] gap-0 items-stretch min-h-0">
          {/* Left — desktop: 100% height (h-screen), no vertical scroll unless overflow, rounded-none */}
          <div className="hidden lg:flex relative bg-brand rounded-none p-8 lg:p-10 flex-col gap-8 overflow-hidden h-screen lg:h-[100dvh] sticky top-0">
            {/* dot grid */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              aria-hidden
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            {/* subtle gradient */}
            <div className="absolute bottom-0 right-0 w-100 h-100 bg-accent-indigo opacity-[0.08] rounded-full blur-3xl pointer-events-none" aria-hidden />

            <div className="relative flex flex-col gap-8 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              {/* Layer 1: logo (replaces pill) */}
              <div>
                <a href="/" className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-sm bg-white text-brand flex items-center justify-center text-2xs font-bold">OK</div>
                  <span className="text-sm font-semibold text-white tracking-tight">
                    OK<span className="text-accent-violet-light">Eng</span>
                  </span>
                </a>
              </div>

              {/* Layer 2: headline 36-44 */}
              <div className="flex flex-col gap-4">
                <h2 className="text-auth-headline lg:text-[40px] lg:leading-[1] font-bold tracking-tight text-white">
                  Vuelve a las respuestas
                  <br />
                  <span className="text-accent-violet-light">que tu equipo puede</span>
                  <br />
                  <span className="text-accent-violet-light">verificar.</span>
                </h2>
                <p className="text-sm leading-relaxed text-white/70 max-w-md">
                  Gestiona tus colecciones, revisa las preguntas sin respuesta y mide cómo tu conocimiento ayuda a cada usuario.
                </p>
              </div>

              {/* Layer 3: flattened rehearsal — single white card, no box-in-box */}
              <div className="mt-2 bg-surface rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-accent-violet flex items-center justify-center text-2xs font-bold text-white">OK</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-ink">Asistente del producto</span>
                      <span className="text-2xs text-ink-muted">Conectado a 128 documentos</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-1 text-2xs text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> En línea
                  </span>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-3/4 bg-accent-indigo rounded-2xl rounded-br-sm px-3 py-2">
                    <p className="text-xs text-white">¿Cómo añado un miembro al workspace?</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-md bg-subtle border border-line flex items-center justify-center text-2xs font-bold text-ink-muted shrink-0">OK</div>
                  <p className="text-xs leading-relaxed text-ink-secondary">
                    Ve a <span className="font-semibold text-ink">Configuración → Miembros</span>, selecciona Invitar y asigna su rol antes de enviar la invitación.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
                  <div className="flex items-center gap-1.5 text-2xs text-ink-muted">
                    <span className="text-emerald-600">🛡</span> Gestión de miembros · sección 3
                  </div>
                  <span className="text-2xs font-medium text-emerald-600">Verificada</span>
                </div>
              </div>

              {/* Restrained: no quote, no logos — keeps 3 layers max */}
            </div>

            {/* Copyright eyebrow inside left panel bottom */}
            <div className="relative pt-6 flex flex-col gap-1">
              <p className="text-2xs text-white/40">© 2026 OKEng · Quiet technical</p>
            </div>
          </div>

          {/* Right — borderless form area transparent on bg-canvas, two components: semi-header + form container, standard padding = left */}
          <div className="order-first lg:order-last flex flex-col p-8 lg:p-10 gap-8 min-h-0">
            {/* Semi-header — full width of right panel, holds Volver + Lang top-right, no extra margin/padding — same level as left logo */}
            <div className="hidden lg:flex w-full items-center justify-end gap-3 shrink-0">
              <a href="/" className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink">
                <span aria-hidden>←</span> Volver a la web
              </a>
              <LanguageSelector variant="compact" />
            </div>
            {/* Form container — centered horizontally when panel wider than form, not vertically centered */}
            <div className="flex flex-col items-center w-full">
              <div className="w-full max-w-[440px] flex flex-col gap-6">{children}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
