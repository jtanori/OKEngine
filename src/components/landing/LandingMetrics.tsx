// CO-LANDING-METRICS — Metrics bar 4 metrics (light, no boxed card)
import React from 'react';
import { Metric } from '../ui/Metric';

export function LandingMetrics() {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-2">
        <Metric value="3 líneas" label="de código para el widget" />
        <Metric value="-73%" label="tickets repetidos" sublabel="según clientes" />
        <Metric value="99.9%" label="uptime" sublabel="SLA" />
        <Metric value="0" label="datos usados para entrenar" sublabel="BYOK" />
      </div>
    </section>
  );
}
