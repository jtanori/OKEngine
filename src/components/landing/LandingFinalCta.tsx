// CO-LANDING-FINAL-CTA — Dark final CTA card
import React from 'react';
import { Rocket } from 'lucide-react';

export function LandingFinalCta() {
  return (
    <section className="w-full bg-canvas py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-ink-strong rounded-[24px] border border-white/10 shadow-xl p-10 md:p-16 flex flex-col items-center gap-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.15),transparent_50%)] pointer-events-none"></div>
          <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80">
            <Rocket className="w-5 h-5" />
          </span>
          <h2 className="text-section md:text-3xl font-bold tracking-tight text-white text-center">Empieza a responder en minutos</h2>
          <p className="text-sm leading-relaxed text-white/70 max-w-2xl">Crea tu primera colección gratis y comprueba hoy mismo cuántas preguntas de tus usuarios OKEng puede responder sin que tu equipo mueva un dedo.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="/signup" className="inline-flex items-center justify-center rounded-md bg-white text-ink-strong px-6 py-3 text-sm font-semibold shadow-sm hover:bg-white/90 transition-colors">
              Crear cuenta gratis
            </a>
            <a href="/docs" className="inline-flex items-center justify-center rounded-md bg-white/5 border border-white/20 text-white px-6 py-3 text-sm font-medium backdrop-blur hover:bg-white/10 transition-colors">
              Explorar la documentación
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-2xs text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Sin tarjeta de crédito
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Cancela cuando quieras
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Tus datos nunca entrenan modelos
            </span>
          </div>
          <div className="w-full max-w-xl h-px bg-white/10 mt-2"></div>
          <div className="flex items-center gap-2 text-2xs text-white/40">
            <span className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-2xs font-bold">OK</span>
            <span className="font-semibold text-white/80">OKEng</span> <span>Tu conocimiento. Dentro de tu producto. Desde el primer día.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
