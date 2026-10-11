// CO-AUTH-SSO-BUTTONS — SSO buttons: Google, GitHub, SAML (future placeholder)
// Uses PR-BUTTON outline + icon per spec, DS tokens, disabled Pronto badge
import React from 'react';
import { Button } from '../ui/Button';

export function SsoButtons() {
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        size="md"
        disabled
        className="w-full opacity-60 cursor-not-allowed"
        title="Próximamente — SSO disponible pronto"
        aria-label="Continuar con Google próximamente"
      >
        <span>Continuar con Google</span>
        <span className="text-2xs bg-elevated px-1.5 py-0.5 rounded-xs border border-line">Pronto</span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="md"
        disabled
        className="w-full opacity-60 cursor-not-allowed"
        title="Próximamente — SSO disponible pronto"
        aria-label="Continuar con GitHub próximamente"
      >
        <span>Continuar con GitHub</span>
        <span className="text-2xs bg-elevated px-1.5 py-0.5 rounded-xs border border-line">Pronto</span>
      </Button>
    </div>
  );
}
