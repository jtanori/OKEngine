'use client';

// CO-AUTH-SHELL — Borderless split 52/48 (PA-AUTH v3.5) — replaces CO-AUTH-SPLIT-LAYOUT
// DS tokens: bg-canvas, bg-brand (ink-strong #05081A alias #080B1A), border-line, accent violet/indigo via @theme
// Spec §3: slim header h-14, restrained dark panel 3 layers max, borderless form transparent max-w 400-460 (~52/48 @1200), quiet footer
// Mobile <768: form-first, compact header, short intro lg:hidden, hide preview/testimonial/logos, no fixed heights
import React from 'react';
import { LanguageSelector } from '../LanguageSelector';

export interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Slim header — shared, single source */}
      <header className="w-full border-b border-line bg-canvas">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-sm bg-ink-strong text-surface flex items-center justify-center text-2xs font-bold">OK</div>
            <span className="text-sm font-semibold text-ink tracking-tight">
              OK<span className="text-accent">Eng</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/" className="hidden sm:inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink">
              <span aria-hidden>←</span> Volver a la web
            </a>
            <LanguageSelector variant="compact" />
          </div>
        </div>
      </header>

      {/* Mobile short intro — form-first context, lg:hidden */}
      <div className="lg:hidden w-full px-6 pt-6 pb-2">
        <div className="max-w-[440px] mx-auto flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink-strong text-white px-3 py-1 text-2xs font-medium">
            <span className="text-white/60">✦</span> Tu conocimiento te espera
          </span>
          <h2 className="text-auth-title font-bold leading-tight tracking-tight text-ink">
            Vuelve a las respuestas <span className="text-accent-violet">que tu equipo puede verificar.</span>
          </h2>
          <p className="text-sm leading-relaxed text-ink-secondary">
            Gestiona tus colecciones, revisa las preguntas sin respuesta y mide cómo tu conocimiento ayuda a cada usuario.
          </p>
        </div>
      </div>

      {/* Split body — 52/48 @1200, shared max-w 1200 (~max-w-7xl) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 lg:p-6 flex flex-col">
        <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[52fr_48fr] gap-6 lg:gap-8 items-start lg:items-stretch">
          {/* Left — restrained dark navy: 3 layers max (pill + headline + rehearsal) — hidden <lg per mobile spec */}
          <div className="hidden lg:flex relative bg-brand rounded-[24px] p-8 lg:p-10 flex-col gap-8 overflow-hidden lg:min-h-[640px]">
            {/* dot grid */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              aria-hidden
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            {/* subtle gradient — uses DS accent-indigo */}
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent-indigo opacity-[0.08] rounded-full blur-3xl pointer-events-none" aria-hidden />

            <div className="relative flex flex-col gap-8 flex-1">
              {/* Layer 1: pill */}
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-2xs font-medium text-white/80">
                  <span className="text-white/60">✦</span> Tu conocimiento te espera
                </span>
              </div>

              {/* Layer 2: headline 36-44 (text-auth-headline) */}
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

              {/* Layer 3: product rehearsal single card */}
              <div className="mt-2 bg-white/[0.06] backdrop-blur rounded-xl border border-white/10 p-4 flex flex-col gap-4">
                <div className="bg-white/[0.06] border border-white/10 rounded-lg p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-accent-violet flex items-center justify-center text-2xs font-bold text-white">OK</div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white">Asistente del producto</span>
                        <span className="text-2xs text-white/50">Conectado a 128 documentos</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-1 text-2xs text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> En línea
                    </span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-accent-indigo rounded-2xl rounded-br-sm px-3 py-2">
                    <p className="text-xs text-white">¿Cómo añado un miembro al workspace?</p>
                  </div>
                </div>

                <div className="bg-white/[0.04] rounded-xl border border-white/5 p-3 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-2xs font-bold text-white/60 shrink-0">OK</div>
                    <p className="text-xs leading-relaxed text-white/80">
                      Ve a <span className="font-semibold text-white">Configuración → Miembros</span>, selecciona Invitar y asigna su rol antes de enviar la invitación.
                    </p>
                  </div>
                  <div className="bg-white/[0.04] border border-white/5 rounded-lg p-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-2xs text-white/50">
                      <span className="text-emerald-400">🛡</span> Gestión de miembros · sección 3
                    </div>
                    <span className="text-2xs font-medium text-emerald-300">Verificada</span>
                  </div>
                </div>
              </div>

              {/* Restrained: no quote, no logos per fabricated-data rule — keeps 3 layers max */}
            </div>
          </div>

          {/* Right — borderless form area transparent on bg-canvas, max-w 400-460, form-first on mobile */}
          <div className="order-first lg:order-last flex flex-col items-center justify-center py-2 lg:py-12">
            <div className="w-full max-w-[440px] flex flex-col gap-6">{children}</div>
          </div>
        </div>

        {/* Quiet footer — subtle, shared */}
        <div className="w-full max-w-[440px] lg:max-w-none mx-auto lg:mx-0 pt-8 flex flex-col items-center gap-2 text-center">
          <p className="text-2xs text-ink-muted">© 2026 OKEng · Quiet technical</p>
        </div>
      </main>
    </div>
  );
}
