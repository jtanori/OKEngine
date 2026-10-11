// CO-LANDING-HOW-IT-WORKS — 5 steps horizontal
import React from 'react';
import { HowItWorks } from '../ui/HowItWorksStep';

export function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="w-full bg-elevated border-y border-line py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-section font-semibold text-ink tracking-tight">Cómo funciona</h2>
          <p className="text-sm text-ink-secondary">De archivos a respuestas en 5 pasos. Files → Collections → Access → Context → Answer.</p>
        </div>
        <HowItWorks
          steps={[
            { title: 'Sube contenido', description: 'Markdown, PDF, URLs. Arrastrar y soltar, sin fricción.' },
            { title: 'Organiza en colecciones', description: 'Agrupa por producto, audiencia o tema. Colecciones ilimitadas.' },
            { title: 'Define quién ve qué', description: 'Permisos por rol: todos, miembros, admins. SSO y SAML.' },
            { title: 'Recupera con contexto híbrido', description: 'Búsqueda semántica + palabras clave. Re-ranking con citas verificables.' },
            { title: 'Responde con citas', description: 'Cada respuesta con fuentes clicables. Sin alucinaciones, ≥98% con cita.' },
          ]}
        />
      </div>
    </section>
  );
}
