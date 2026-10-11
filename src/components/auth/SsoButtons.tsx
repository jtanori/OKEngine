// CO-AUTH-SSO-BUTTONS — SSO buttons: Google, GitHub, SAML (future placeholder)
import React from 'react';

export function SsoButtons() {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled
        className="w-full h-9 rounded-sm border border-line bg-surface text-sm text-ink-secondary flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
        title="Próximamente"
      >
        <span>Continuar con Google</span>
        <span className="text-2xs bg-elevated px-1.5 py-0.5 rounded-xs">Pronto</span>
      </button>
      <button
        type="button"
        disabled
        className="w-full h-9 rounded-sm border border-line bg-surface text-sm text-ink-secondary flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
        title="Próximamente"
      >
        <span>Continuar con GitHub</span>
        <span className="text-2xs bg-elevated px-1.5 py-0.5 rounded-xs">Pronto</span>
      </button>
    </div>
  );
}
