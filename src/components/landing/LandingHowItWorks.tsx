// CO-LANDING-HOW-IT-WORKS — 5 steps horizontal (light canvas, no gray band)
import React from 'react';
import { HowItWorks } from '../ui/HowItWorksStep';

export function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="w-full bg-canvas py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-section font-semibold text-ink tracking-tight">De tus archivos a respuestas, en cinco pasos</h2>
          <p className="text-sm text-ink-secondary">Sin infraestructura, sin pipelines que mantener. Subes el contenido, defines los permisos y OKEng hace el resto.</p>
        </div>
        <HowItWorks
          steps={[
            { title: 'Sube tu contenido', description: 'Markdown, PDF, DOCX, HTML o sitemap. Sincronización con Git y Notion.' },
            { title: 'Organiza en colecciones', description: 'Agrupa por producto, versión o equipo. Cada colección se mantiene al día sola.' },
            { title: 'Define quién ve qué', description: 'Visibilidad por colección: todos, miembros o admins. Retrieval solo con lo autorizado.' },
            { title: 'Recupera con contexto', description: 'Búsqueda híbrida semántica y por palabras clave sobre lo que el usuario puede ver.' },
            { title: 'Responde con citas', description: 'Cada respuesta enlaza a su fuente y fragmento exacto. Verificable, siempre.' },
          ]}
        />
      </div>
    </section>
  );
}
