// CO-LANDING-FINAL-CTA — Dark final CTA (target: "Empieza a responder en minutos")
import React from 'react';

export function LandingFinalCta() {
  return (
    <section className="w-full bg-ink-strong py-16 md:py-20">
      <div className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-6 text-center">
        <h2 className="text-section font-semibold tracking-tight text-white text-center">Empieza a responder en minutos</h2>
        <p className="text-sm leading-relaxed text-white/70">1.000 consultas gratis, sin tarjeta. Cancela cuando quieras. Soporte ES/EN.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="/signup" className="inline-flex items-center justify-center rounded-sm bg-white text-ink-strong px-6 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors">
            Empieza gratis
          </a>
          <a href="/login" className="inline-flex items-center justify-center rounded-sm border border-white/20 text-white px-6 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors">
            Ver demo
          </a>
        </div>
        <div className="flex items-center gap-2 text-2xs text-white/50">
          <span>Sin tarjeta</span><span>•</span><span>Cancela cuando quieras</span><span>•</span><span>Soporte en ES/EN</span>
        </div>
      </div>
    </section>
  );
}
