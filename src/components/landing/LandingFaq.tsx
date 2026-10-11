// CO-LANDING-FAQ — FAQ accordion 6 Q
import React from 'react';
import { FaqAccordion } from '../ui/FaqAccordion';

export function LandingFaq() {
  return (
    <section id="faq" className="w-full bg-surface border-y border-line py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-6 flex flex-col gap-8">
        <h2 className="text-section font-semibold text-ink tracking-tight text-center">Preguntas frecuentes</h2>
        <FaqAccordion
          items={[
            { question: '¿Cuánto tarda la integración?', answer: '3 líneas de código, una tarde. SDKs React/Vue/JS, API REST, webhooks. Instalación verificada con HMAC opcional.' },
            { question: '¿Usáis mis datos para entrenar?', answer: 'Nunca. 0 datos usados para entrenar. Trae tu propia clave (BYOK) OpenAI/Anthropic/Azure/Bedrock/local. Despliega en UE.' },
            { question: '¿Cómo funcionan los permisos?', answer: '3 niveles: todos, miembros, admins. Hereda de tu app vía SSO/SAML, filtrado en retrieval antes de vector search, no solo UI.' },
            { question: '¿Qué formatos soportáis?', answer: 'Markdown, MDX, PDF, URLs. Sincronización automática, re-index, chunking, embeddings. Estado uploading → processing → ready|failed.' },
            { question: '¿Qué pasa si no hay fuente?', answer: 'Responde "No tengo fuente para eso" con ≥98% con cita. Sin alucinaciones, fuentes clicables con excerpt.' },
            { question: '¿Puedo migrar desde X?', answer: 'Sí, API de importación, soporte migración, preserva estructura colecciones. Contacta para ayuda.' },
          ]}
        />
      </div>
    </section>
  );
}
