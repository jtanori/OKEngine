// CO-LANDING-METRICS — Metrics bar 4 metrics in bordered card
import React from 'react';
import { Metric } from '../ui/Metric';

export function LandingMetrics() {
  return (
    <section className="w-full bg-canvas py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line border border-line rounded-xl bg-surface overflow-hidden text-center">
          <Metric value="3 líneas" label="para integrar el widget" />
          <Metric value="−73%" label="tickets de soporte (media)" />
          <Metric value="99,9%" label="uptime comprometido (SLA)" />
          <Metric value="0" label="datos usados para entrenar IA" />
        </div>
      </div>
    </section>
  );
}
