// CO-LANDING-FAQ — FAQ 6 Q two-col with left card
import React from 'react';
import { FaqAccordion } from '../ui/FaqAccordion';
import { SectionPill } from '../ui/SectionPill';
import { MessageCircle, Mail } from 'lucide-react';

export function LandingFaq() {
  return (
    <section id="faq" className="w-full bg-canvas py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-[360px_1fr] gap-12 items-start">
        <div className="flex flex-col gap-4">
          <SectionPill label="Preguntas frecuentes" />
          <h2 className="text-section font-bold text-ink-strong tracking-tight">Las dudas que siempre aparecen</h2>
          <p className="text-sm text-ink-secondary">Y si te falta alguna, responde una persona, no un bot.</p>
          <div className="bg-elevated/50 border border-line rounded-xl p-6 flex flex-col gap-4">
            <span className="w-8 h-8 rounded-lg bg-accent-subtle text-accent flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">¿Hablamos de tu caso?</div>
              <div className="text-xs text-ink-secondary mt-1">Cuéntanos qué quieres embeber y te decimos si OKEng encaja. Sin demo de 45 minutos.</div>
            </div>
            <a href="mailto:hola@okeng.com" className="inline-flex items-center gap-1.5 w-fit bg-surface border border-line rounded-md px-3 py-1.5 text-xs font-medium shadow-sm">
              <Mail className="w-3.5 h-3.5 text-accent" /> hola@okeng.com
            </a>
          </div>
        </div>
        <FaqAccordion
          items={[
            { question: '¿Cuánto tarda la integración?', answer: 'La mayoría de equipos tiene el widget en producción en una tarde. Subes el contenido (o conectas tu repo) y pegas tres líneas de código. No hay servidores de vectores que aprovisionar ni pipelines que mantener.' },
            { question: '¿Mis datos se usan para entrenar modelos?', answer: 'No. Tus datos nunca se usan para entrenar modelos. Opción BYOK y despliegue en UE.' },
            { question: '¿Puedo restringir qué ve cada usuario?', answer: 'Sí. Visibilidad por colección: todos, miembros o admins. El retrieval solo lee lo autorizado.' },
            { question: '¿Qué formatos de contenido soporta?', answer: 'Markdown, MDX, PDF, URLs, HTML via sitemap. Sincronización automática.' },
            { question: '¿Qué pasa si una respuesta no tiene fuente?', answer: 'Si no hay fuente, OKEng responde que no tiene fuente para eso, con ≥98% con cita. No alucina.' },
            { question: '¿Puedo migrar desde otra herramienta?', answer: 'Sí. Importación vía API y soporte asistido.' },
          ]}
        />
      </div>
    </section>
  );
}
