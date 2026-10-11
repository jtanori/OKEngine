// CO-LANDING-FINAL-CTA — Dark final CTA card with glow (like Right target)
import React from 'react';
import { Rocket } from 'lucide-react';

export function LandingFinalCta() {
  return (
    <section className="w-full bg-canvas py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-ink-strong rounded-[24px] border border-white/10 shadow-xl p-10 md:p-14 flex flex-col items-center gap-6 text-center relative overflow-hidden">
          {/* Glow behind card — like Right lightning */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-[600px] h-[400px] bg-[#6366F1]/20 blur-[80px] rounded-full" />
            <div className="absolute -bottom-24 -right-24 w-[600px] h-[400px] bg-[#8B5CF6]/20 blur-[80px] rounded-full" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.12),transparent_60%)]" />
          </div>
          <span className="relative w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80 shadow-sm">
            <Rocket className="w-5 h-5" />
          </span>
          <h2 className="relative text-[30px] lg:text-[34px] font-bold tracking-tight text-white text-center leading-tight">Empieza a responder en minutos</h2>
          <p className="relative text-[15px] leading-relaxed text-white/70 max-w-2xl">Crea tu primera colección gratis y comprueba hoy mismo cuántas preguntas de tus usuarios OKEng puede responder sin que tu equipo mueva un dedo.</p>
          <div className="relative flex flex-wrap items-center justify-center gap-3">
            <a href="/signup" className="inline-flex items-center justify-center rounded-lg bg-white text-ink-strong px-6 py-3 text-sm font-semibold shadow-sm hover:bg-white/90 transition-colors">
              Crear cuenta gratis
            </a>
            <a href="/docs" className="inline-flex items-center justify-center rounded-lg bg-white/5 border border-white/20 text-white px-6 py-3 text-sm font-medium backdrop-blur hover:bg-white/10 transition-colors">
              Explorar la documentación
            </a>
          </div>
          <div className="relative flex flex-wrap items-center justify-center gap-5 text-xs text-white/70">
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
          <div className="relative w-full max-w-xl h-px bg-white/10 mt-2"></div>
          <div className="relative flex items-center gap-2 text-xs text-white/50">
            <span className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-2xs font-bold">OK</span>
            <span className="font-semibold text-white/80">OKEng</span> <span>Tu conocimiento. Dentro de tu producto. Desde el primer día.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
