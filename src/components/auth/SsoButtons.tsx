// CO-AUTH-SSO-BUTTONS — SSO buttons: Google, GitHub (locked v2: vertical full-width white pill, disabled Pronto in tooltip)
// Uses PR-BUTTON secondary rounded-lg border shadow-sm, DS tokens
import React from 'react';
import { Button } from '../ui/Button';

export function SsoButtons() {
  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="secondary"
        size="md"
        disabled
        className="w-full bg-surface border-line rounded-lg shadow-sm justify-center gap-2 opacity-90"
        title="Próximamente — SSO disponible pronto"
        aria-label="Continuar con Google próximamente"
      >
        <span className="w-4 h-4 rounded-full bg-white border flex items-center justify-center text-[10px] font-bold text-[#4285F4]">G</span>
        <span>Continuar con Google</span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="md"
        disabled
        className="w-full bg-surface border-line rounded-lg shadow-sm justify-center gap-2 opacity-90"
        title="Próximamente — SSO disponible pronto"
        aria-label="Continuar con GitHub próximamente"
      >
        <span className="w-4 h-4 rounded-full bg-ink text-surface flex items-center justify-center text-[10px]">◯</span>
        <span>Continuar con GitHub</span>
      </Button>
    </div>
  );
}
