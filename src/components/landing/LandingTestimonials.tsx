// CO-LANDING-TESTIMONIALS — 3 testimonials
import React from 'react';
import { TestimonialCard } from '../ui/TestimonialCard';
import { SectionPill } from '../ui/SectionPill';

export function LandingTestimonials() {
  return (
    <section id="clientes" className="w-full bg-canvas py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8 items-center">
        <SectionPill label="Clientes" />
        <div className="max-w-3xl flex flex-col gap-3 text-center">
          <h2 className="text-section font-bold text-ink-strong tracking-tight">Equipos que ya responden con OKEng</h2>
          <p className="text-sm text-ink-secondary">Soporte que baja, documentación que se lee y desarrollos que salen en días, no en trimestres.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 w-full">
          <TestimonialCard
            quote="Pasamos de 340 tickets por semana a 90. Lo que más valora el usuario es que la respuesta viene con la cita: se la cree y deja de preguntarnos."
            author="Marta Ibáñez"
            role="Head of Support"
            company="Nexora"
            initials="MI"
            color="bg-[#8B5CF6]"
            metric="−73% tickets de soporte"
          />
          <TestimonialCard
            quote="Montamos el widget en producción en una tarde. En otras herramientas nos costó un mes solo resolver que el retrieval respetara los permisos por rol."
            author="Diego Serrano"
            role="CTO"
            company="Kubelab"
            initials="DS"
            color="bg-[#0EA5E9]"
            metric="1 tarde de integración"
          />
          <TestimonialCard
            quote="Nuestra documentación por fin se lee. Cada semana recibimos el listado de preguntas sin respuesta y sabemos exactamente qué documento falta escribir."
            author="Lucía Ferrer"
            role="Product Lead"
            company="Dataflow"
            initials="LF"
            color="bg-[#10B981]"
            metric="+41% documentación leída"
          />
        </div>
        <p className="text-center text-sm font-semibold text-ink">
          <span className="font-bold">+400 equipos</span> y <span className="font-bold">1,2M de respuestas</span> <span className="font-normal text-ink-secondary">servidas el último mes.</span>
        </p>
      </div>
    </section>
  );
}
