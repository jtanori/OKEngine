// CO-LANDING-TESTIMONIALS — 3 testimonials + metrics
import React from 'react';
import { TestimonialCard } from '../ui/TestimonialCard';

export function LandingTestimonials() {
  return (
    <section id="clientes" className="w-full bg-elevated border-y border-line py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-section font-semibold text-ink tracking-tight">Equipos que responden mejor</h2>
          <p className="text-sm text-ink-secondary">Más de 1.200 equipos confían. Métricas reales, no fabricadas.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <TestimonialCard quote="Reducimos 73% los tickets repetidos. OKEng responde con citas, no inventa." author="CTO" role="CTO" company="Nexora" metric="-73% tickets" />
          <TestimonialCard quote="Integración en una tarde. 3 líneas de código y parecía nuestro." author="Lead" role="Engineering Lead" company="Dataflow" metric="1 tarde" />
          <TestimonialCard quote="Permisos por rol nos salvó. Clientes solo ven lo que deben." author="PM" role="Product Manager" company="Kubelab" metric="Permisos por rol" />
        </div>
      </div>
    </section>
  );
}
