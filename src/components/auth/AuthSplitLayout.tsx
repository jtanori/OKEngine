'use client';

// CO-AUTH-SPLIT-LAYOUT — PA-AUTH-SPLIT 55/45 product rehearsal + form
// DS tokens: bg-canvas, bg-ink-strong #05081A, border-line, rounded-[24px], text-white, accent
// v3.3 locked liked v2 — shared header h-14 max-w-7xl, left rehearses Asistente del producto En línea + Verificada
import React from 'react';
import { LanguageSelector } from '../LanguageSelector';

export interface AuthSplitLayoutProps {
  children: React.ReactNode;
}

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Shared header — single source, not per-panel */}
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

      {/* Split body — max-w-7xl grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-6 lg:gap-8">
        {/* Left — product rehearsal dark */}
        <div className="relative bg-ink-strong rounded-[24px] p-8 lg:p-10 flex flex-col gap-8 overflow-hidden min-h-[600px] lg:min-h-[700px]">
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
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#6366F1] opacity-[0.08] rounded-full blur-3xl pointer-events-none" aria-hidden />

          <div className="relative flex flex-col gap-8 flex-1">
            {/* pill */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-2xs font-medium text-white/80">
                <span className="text-white/60">✦</span> Tu conocimiento te espera
              </span>
            </div>

            {/* headline */}
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl lg:text-[36px] font-bold leading-[0.95] tracking-tight text-white">
                Vuelve a las respuestas
                <br />
                <span className="text-[#A78BFA]">que tu equipo puede</span>
                <br />
                <span className="text-[#A78BFA]">verificar.</span>
              </h2>
              <p className="text-sm leading-relaxed text-white/70 max-w-md">
                Gestiona tus colecciones, revisa las preguntas sin respuesta y mide cómo tu conocimiento ayuda a cada usuario.
              </p>
            </div>

            {/* Asistente card */}
            <div className="mt-2 bg-white/[0.06] backdrop-blur rounded-xl border border-white/10 p-4 flex flex-col gap-4">
              <div className="bg-white/[0.06] border border-white/10 rounded-lg p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-[#8B5CF6] flex items-center justify-center text-2xs font-bold text-white">OK</div>
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
                <div className="max-w-[75%] bg-[#6366F1] rounded-2xl rounded-br-sm px-3 py-2">
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

            {/* Quote — illustrative */}
            <div className="mt-auto flex flex-col gap-3 pt-4">
              <div className="text-[#6366F1] text-2xl leading-none">“</div>
              <p className="text-sm text-white/80 leading-relaxed">OKEng redujo a la mitad el tiempo que pasábamos buscando información. <span className="text-white/40 text-2xs">— ejemplo ilustrativo</span></p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white text-ink-strong flex items-center justify-center text-xs font-bold">A</div>
                <span className="text-xs text-white/60">Ana Torres, Ops Manager en Acme Corp. (ejemplo)</span>
              </div>
            </div>

            {/* Trust logos */}
            <div className="flex flex-col gap-2">
              <span className="text-2xs text-white/40">Confían en OKEng</span>
              <div className="flex items-center gap-6 text-white/50 text-xs">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className="text-lg">◬</span> Acme
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">◈</span> Globex
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-sm bg-white/20 flex items-center justify-center text-[10px]">⬢</span> Initech
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-sm bg-white/20 flex items-center justify-center text-[10px]">⬣</span> Soylent
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex flex-col items-center justify-center py-6 lg:py-12">
          <div className="w-full max-w-md flex flex-col gap-6">{children}</div>
          {/* outside trust + footer — rendered inside AuthCard trustFooter but keep spacer for spec */}
        </div>
      </main>
    </div>
  );
}
