// CO-LANDING-TESTIMONIALS — 3 testimonials (light canvas, no gray band)
import React from 'react';
import { TestimonialCard } from '../ui/TestimonialCard';

export function LandingTestimonials() {
  return (
    <section id="clientes" className="w-full bg-canvas py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-section font-semibold text-ink tracking-tight">Equipos que ya responden con OKEng</h2>
          <p className="text-sm text-ink-secondary">Soporte que baja, documentación que se lee y desarrollos que salen en días, no en trimestres.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <TestimonialCard quote="Pasamos de 340 tickets por semana a 90. Lo que más valora el usuario es que la respuesta viene con la cita: se la cree y deja de preguntarnos." author="Marta Ibáñez" role="Head of Support" company="Nexora" metric="−73% tickets" />
          <TestimonialCard quote="Montamos el widget en producción en una tarde. En otras herramientas nos costó un mes solo resolver que el retrieval respetara los permisos por rol." author="Diego Serrano" role="CTO" company="Kubelab" metric="1 tarde" />
          <TestimonialCard quote="Nuestra documentación por fin se lee. Cada semana recibimos el listado de preguntas sin respuesta y sabemos exactamente qué documento falta escribir." author="Lucía Ferrer" role="Product Lead" company="Dataflow" metric="+41% leída" />
        </div>
        <p className="text-center text-xs text-ink-muted">+400 equipos y 1,2M de respuestas servidas el último mes.</p>
      </div>
    </section>
  );
}
