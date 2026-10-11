// CO-AUTH-TRUST-FOOTER — Trust badges + terms links below card
import React from 'react';
import { TrustFooter } from '../ui/TrustBadge';

export function AuthTrustFooter() {
  return (
    <div className="flex flex-col gap-3 items-center">
      <TrustFooter badges={['Citas verificables', 'Permisos por rol', 'Sin tarjeta']} />
      <div className="text-2xs text-ink-muted">
        Al continuar, aceptas <a href="/terms" className="underline hover:text-ink">Términos</a> y <a href="/privacy" className="underline hover:text-ink">Privacidad</a>
      </div>
    </div>
  );
}
