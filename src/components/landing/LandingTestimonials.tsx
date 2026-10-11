// CO-LANDING-TESTIMONIALS — 3 neutral use-case examples — no fabricated identities/quotes
import React from 'react';
import { SectionPill } from '../ui/SectionPill';

function UseCaseCard({ title, desc, icon, color }: { title: string; desc: string; icon: string; color: string }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-6 shadow-sm flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-lg ${color} text-white flex items-center justify-center text-sm`}>{icon}</div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink-secondary leading-relaxed">{desc}</p>
      <span className="mt-auto inline-flex w-fit rounded-full bg-subtle border border-line text-ink-muted text-2xs px-2.5 py-1">Ejemplo ilustrativo</span>
    </div>
  );
}

export function LandingTestimonials() {
  return (
    <section id="clientes" className="w-full bg-canvas py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-10 items-center">
        <SectionPill label="Casos de uso" />
        <div className="max-w-2xl flex flex-col gap-4 text-center">
          <h2 className="text-[32px] lg:text-[36px] font-bold text-ink-strong tracking-tight leading-tight">Cómo los equipos usan OKEng</h2>
          <p className="text-[15px] leading-relaxed text-ink-secondary">Ejemplos de uso ilustrativos — no son testimonios de clientes verificados ni compromisos de resultado.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 w-full">
          <UseCaseCard
            title="Centro de ayuda con citas"
            desc="Las respuestas incluyen fuente y fragmento verificable, reduciendo repreguntas."
            icon="◬"
            color="bg-accent-violet"
          />
          <UseCaseCard
            title="Incorporación rápida"
            desc="Widget integrado sin infraestructura adicional. Esfuerzo de ejemplo, no SLA."
            icon="⚡"
            color="bg-[#0EA5E9]"
          />
          <UseCaseCard
            title="Documentación viva"
            desc="Listado semanal de preguntas sin respuesta para priorizar qué documentar."
            icon="◈"
            color="bg-[#10B981]"
          />
        </div>
        <p className="text-center text-2xs text-ink-muted">* Ejemplos ilustrativos. No representan clientes verificados ni métricas comprometidas. Límites y precios verificables en Precios y contrato.</p>
      </div>
    </section>
  );
}
