// CO-LANDING-METRICS — Metrics bar 4 metrics — verified plan limits + integration, not outcome claims
import React from 'react';
import { Metric } from '../ui/Metric';

export function LandingMetrics() {
  return (
    <section className="w-full bg-canvas py-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line border border-line rounded-xl bg-transparent overflow-hidden text-center">
          <Metric value="3 líneas" label="para integrar el widget" />
          <Metric value="1.000" label="consultas / mes gratis" />
          <Metric value="10.000" label="consultas / mes Pro" />
          <Metric value="0" label="datos para entrenar IA" />
        </div>
        <p className="text-2xs text-ink-muted text-center">Límites verificados por plan: Starter 1.000, Pro 10.000 consultas/mes. 0 datos para entrenar: ver Política de privacidad y contrato. Disponibilidad objetivo 99,9% solo con SLA Escala.</p>
      </div>
    </section>
  );
}
