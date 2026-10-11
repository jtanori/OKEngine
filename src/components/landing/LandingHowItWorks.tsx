// CO-LANDING-HOW-IT-WORKS — 5 steps with cards and illustrations
import React from 'react';
import { HowItWorks } from '../ui/HowItWorksStep';
import { SectionPill } from '../ui/SectionPill';

export function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="w-full bg-canvas py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8 items-center">
        <SectionPill label="Cómo funciona" />
        <div className="max-w-3xl flex flex-col gap-3 text-center">
          <h2 className="text-section font-bold text-ink-strong tracking-tight">De tus archivos a respuestas, en cinco pasos</h2>
          <p className="text-sm text-ink-secondary">Sin infraestructura, sin pipelines que mantener. Subes el contenido, defines los permisos y OKEng hace el resto.</p>
        </div>
        <HowItWorks
          steps={[
            {
              title: 'Sube tu contenido',
              description: 'Markdown, PDF, DOCX, HTML o sitemap. Sincronización con Git y Notion.',
              illustration: <div className="text-xs text-ink-muted">MD PDF<br/>subiendo…</div>,
            },
            {
              title: 'Organiza en colecciones',
              description: 'Agrupa por producto, versión o equipo. Cada colección se mantiene al día sola.',
              illustration: <div className="flex flex-col gap-1 w-full px-4"><div className="h-3 bg-accent-subtle rounded-sm"></div><div className="h-3 bg-elevated rounded-sm"></div><div className="h-3 bg-elevated rounded-sm"></div></div>,
            },
            {
              title: 'Define quién ve qué',
              description: 'Visibilidad por colección: todos, miembros o admins. Retrieval solo con lo autorizado.',
              illustration: <div className="flex items-center justify-center gap-1"><span className="w-6 h-6 rounded-full bg-accent text-surface flex items-center justify-center text-2xs">✓</span><span className="text-xs">●●●</span></div>,
            },
            {
              title: 'Recupera con contexto',
              description: 'Búsqueda híbrida semántica y por palabras clave sobre lo que el usuario puede ver.',
              illustration: <div className="w-full px-3 py-2 bg-white border border-line rounded-md text-2xs text-ink-muted">sso saml proveedor</div>,
            },
            {
              title: 'Responde con citas',
              description: 'Cada respuesta enlaza a su fuente y fragmento exacto. Verificable, siempre.',
              illustration: <div className="text-2xs bg-accent text-surface rounded-full px-3 py-1">¿Cómo configuro SSO?</div>,
            },
          ]}
        />
        <div className="text-xs text-ink-secondary text-center">
          Tiempo medio hasta la primera respuesta en producción: <span className="font-semibold text-ink">un día.</span>{' '}
          <a href="/signup" className="text-accent underline">
            Empieza ahora →
          </a>
        </div>
      </div>
    </section>
  );
}
