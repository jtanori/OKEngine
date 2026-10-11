// PR-CHAT-MOCK — Chat mock UI with header, messages, citations, input
// DS tokens: bg-surface, border-line, rounded-lg, shadow-lg, text-ink
import React from 'react';

export interface ChatMockProps {
  className?: string;
}

export function ChatMock({ className = '' }: ChatMockProps) {
  return (
    <div className={`bg-surface border border-line rounded-lg shadow-lg overflow-hidden flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-elevated">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success"></div>
          <span className="text-xs font-medium text-ink">OKEng — Demo en vivo</span>
        </div>
        <span className="text-2xs text-ink-muted">En línea</span>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3 bg-canvas">
        <div className="self-end bg-ink text-surface rounded-lg rounded-br-sm px-3 py-2 text-xs max-w-[80%]">¿Cómo configuro SSO?</div>
        <div className="self-start bg-surface border border-line rounded-lg rounded-bl-sm px-3 py-2 text-xs text-ink max-w-[85%] flex flex-col gap-2">
          <span>Para configurar SSO, ve a Configuración → Miembros y RBAC → SSO. Necesitas tu IdP con SAML 2.0.</span>
          <div className="flex gap-1">
            <span className="inline-flex items-center rounded-xs bg-accent-subtle px-1.5 py-0.5 text-2xs text-accent border border-line">[1] SSO Setup</span>
            <span className="inline-flex items-center rounded-xs bg-accent-subtle px-1.5 py-0.5 text-2xs text-accent border border-line">[2] SAML Guide</span>
          </div>
        </div>
      </div>
      <div className="px-3 py-2 border-t border-line bg-surface">
        <div className="flex items-center gap-2 bg-elevated border border-line rounded-sm px-3 py-2">
          <span className="text-xs text-ink-muted flex-1">Pregunta sobre tu docs...</span>
          <span className="text-accent text-xs">↗</span>
        </div>
      </div>
    </div>
  );
}
