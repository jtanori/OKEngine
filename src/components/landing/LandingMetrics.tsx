// CO-LANDING-METRICS — Metrics bar 4 metrics in bordered card — illustrative / targets, not contractual
import React from 'react';
import { Metric } from '../ui/Metric';

export function LandingMetrics() {
  return (
    <section className="w-full bg-canvas py-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line border border-line rounded-xl bg-surface overflow-hidden text-center">
          <Metric value="3 líneas" label="para integrar el widget" />
          <Metric value="−73%*" label="tickets (media ilustrativa)" />
          <Metric value="99,9%*" label="objetivo disponibilidad" />
          <Metric value="0" label="datos para entrenar IA*" />
        </div>
        <p className="text-2xs text-ink-muted text-center">* −73% y 99,9% son resultados/objetivos ilustrativos; el SLA contractual solo aplica en plan Escala. 0 datos para entrenar: ver Política de privacidad y contrato.</p>
      </div>
    </section>
  );
}
