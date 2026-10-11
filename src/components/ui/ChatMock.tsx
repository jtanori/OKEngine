// PR-CHAT-MOCK — Chat mock UI — Left target rehearsal (OKEng En línea)
// DS tokens: bg-surface, border-line, rounded-lg, shadow-lg, text-ink
import React from 'react';

export interface ChatMockProps {
  className?: string;
}

export function ChatMock({ className = '' }: ChatMockProps) {
  return (
    <div className={`bg-surface border border-line rounded-xl shadow-lg overflow-hidden flex flex-col ${className}`}>
      {/* Header — OKEng En línea */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-2xs font-bold text-white">O</div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-ink">OKEng</span>
            <span className="text-2xs text-ink-muted">En línea</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-1 text-2xs text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> En línea
        </span>
      </div>

      {/* Body — 3 Qs rehearsal like Left target */}
      <div className="flex-1 p-3 flex flex-col gap-2 bg-canvas">
        <div className="bg-surface border border-line rounded-lg px-3 py-2 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-medium text-ink">Guía de SSO - autentificación…</span>
            <span className="text-2xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-1.5 py-0.5">Verificada</span>
          </div>
          <span className="text-2xs text-ink-muted">9 proveedores de identidad · SSO · SAML 2.0</span>
        </div>
        <div className="self-start bg-surface border border-line rounded-lg rounded-bl-sm px-3 py-2 text-xs text-ink max-w-[85%]">
          ¿Qué proveedores son compatibles?
        </div>
        <div className="self-end bg-accent text-surface rounded-lg rounded-br-sm px-3 py-2 text-xs max-w-4/5">¿Puedo probar con mi equipo?</div>
        <div className="self-start bg-surface border border-line rounded-lg rounded-bl-sm px-3 py-2 text-xs text-ink max-w-[85%] flex flex-col gap-2">
          <span>Respuesta con citas — Fuente verificada, 1 alucinación</span>
          <span className="inline-flex items-center rounded-xs bg-accent-subtle px-1.5 py-0.5 text-2xs text-accent border border-line w-fit">[1] SSO Setup</span>
        </div>
      </div>

      {/* Input + Built with Arona footer */}
      <div className="px-3 py-2 border-t border-line bg-surface flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-elevated border border-line rounded-sm px-3 py-2">
          <span className="text-xs text-ink-muted flex-1">Haz una pregunta…</span>
          <span className="w-6 h-6 rounded-sm bg-accent flex items-center justify-center text-2xs text-white">↗</span>
        </div>
        <div className="flex items-center justify-between text-2xs text-ink-muted">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-ink-strong text-surface flex items-center justify-center rounded-xs text-2xs">◫</span> Built with Arona</span>
          <span>Content is user-generated and unverified</span>
        </div>
      </div>
    </div>
  );
}
