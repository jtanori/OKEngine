// CO-LANDING-FINAL-CTA — Final centered CTA
import React from 'react';

export function LandingFinalCta() {
  return (
    <section className="w-full max-w-3xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center gap-6 text-center">
      <h2 className="text-section font-semibold text-ink tracking-tight">Empieza a responder en minutos</h2>
      <p className="text-sm text-ink-secondary">1.000 consultas gratis, sin tarjeta. Cancela cuando quieras. Soporte ES/EN.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a href="/signup" className="inline-flex items-center justify-center rounded-sm bg-ink text-surface px-6 py-2.5 text-sm font-medium hover:bg-ink-strong transition-colors">
          Empieza gratis
        </a>
        <a href="#como-funciona" className="inline-flex items-center justify-center rounded-sm border border-line bg-surface text-ink px-6 py-2.5 text-sm font-medium hover:bg-elevated transition-colors">
          Ver demo
        </a>
      </div>
      <div className="flex items-center gap-2 text-2xs text-ink-muted">
        <span>Sin tarjeta</span><span>•</span><span>Cancela cuando quieras</span><span>•</span><span>Soporte en ES/EN</span>
      </div>
    </section>
  );
}
