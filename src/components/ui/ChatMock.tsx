// PR-CHAT-MOCK — Hero mock pixel-matched to Left target (arena.site)
// Target: OKEng Asistente de conocimiento · En línea · ¿Cómo configuro SSO? → Para co… · Guía de SSO · authentication/sso.md · Fragmento 2 de 3 · 0,94 · Verificada · Haz una pregunta… · Respuesta con cita / 3 líneas
// DS only: bg-surface/canvas/elevated, border-line, text-ink, accent-violet/indigo, success — no hard hex
import React from 'react';

export interface ChatMockProps {
  className?: string;
}

export function ChatMock({ className = '' }: ChatMockProps) {
  return (
    <div className={`bg-surface border border-line rounded-xl shadow-lg overflow-hidden flex flex-col ${className}`}>
      {/* Header — OK + OKEng / Asistente de conocimiento + En línea */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ink-strong flex items-center justify-center text-2xs font-bold text-white shrink-0">OK</div>
          <div className="flex flex-col leading-none">
            <span className="text-xs font-semibold text-ink">OKEng</span>
            <span className="text-2xs text-ink-muted">Asistente de conocimiento</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-2xs font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> En línea
        </span>
      </div>

      {/* Body — single Q/A like target */}
      <div className="flex-1 p-4 flex flex-col gap-3 bg-canvas">
        {/* User bubble — right aligned */}
        <div className="self-end max-w-4/5 bg-ink-strong text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-sm">
          <p className="text-xs font-medium leading-relaxed">¿Cómo configuro SSO?</p>
        </div>

        {/* Assistant — avatar + answer snippet + citation card */}
        <div className="flex gap-2.5 items-start">
          <div className="w-6 h-6 rounded-md bg-ink-strong flex items-center justify-center text-2xs font-bold text-white shrink-0 mt-0.5">OK</div>
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="bg-surface border border-line rounded-xl rounded-tl-sm px-3 py-2.5 shadow-sm">
              <p className="text-xs leading-relaxed text-ink-secondary line-clamp-2">Para configurar SSO ve a Configuración → SSO y conecta tu proveedor SAML. Sigue la guía paso a paso.</p>
              {/* Citation fragment card — like target Guía de SSO */}
              <div className="mt-2.5 rounded-lg border border-line bg-subtle px-2.5 py-2 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xs font-medium text-ink truncate">Guía de SSO · authentication/sso.md</span>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-2xs font-medium text-emerald-700 shrink-0">Verificada</span>
                </div>
                <div className="flex items-center gap-1.5 text-2xs text-ink-muted flex-wrap">
                  <span>Fragmento 2 de 3</span>
                  <span className="h-1 w-1 rounded-full bg-line-strong" />
                  <span>coincidencia 0,94</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-line bg-surface flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-elevated border border-line rounded-full px-3.5 py-2.5">
          <span className="text-xs text-ink-muted flex-1">Haz una pregunta…</span>
          <span className="w-7 h-7 rounded-full bg-ink-strong flex items-center justify-center text-white text-xs shrink-0">↑</span>
        </div>
        {/* Footer cues like target: Respuesta con cita / 3 líneas */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-2xs text-ink-muted">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-2xs text-emerald-600">✓</span>
            Respuesta con cita · Fuente verificable
          </span>
          <span className="inline-flex items-center gap-1 text-2xs text-ink-muted font-medium">
            <span className="font-mono text-2xs">{'</>'}</span> 3 líneas de código
          </span>
        </div>
      </div>
    </div>
  );
}
