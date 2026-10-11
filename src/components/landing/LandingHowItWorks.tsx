// CO-LANDING-HOW-IT-WORKS — 5 steps with pastel illustrations — Left target
import React from 'react';
import { HowItWorks } from '../ui/HowItWorksStep';
import { SectionPill } from '../ui/SectionPill';

export function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="w-full bg-canvas py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-10 items-center">
        <SectionPill label="Cómo funciona" />
        <div className="max-w-2xl flex flex-col gap-4 text-center">
          <h2 className="text-[32px] lg:text-[36px] font-bold text-ink-strong tracking-tight leading-tight">De tus archivos a respuestas, en cinco pasos</h2>
          <p className="text-[15px] leading-relaxed text-ink-secondary max-w-xl mx-auto">Sin infraestructura, sin pipelines que mantener. Subes el contenido, defines los permisos y OKEng hace el resto.</p>
        </div>
        <HowItWorks
          steps={[
            {
              title: 'Sube tu contenido',
              description: 'Markdown, PDF, DOCX, HTML o sitemap. Sincronización con Git y Notion.',
              illustration: (
                <div className="w-full bg-white border border-line rounded-md p-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-2xs text-ink-muted"><span className="w-6 h-4 bg-accent-subtle rounded-xs border border-line flex items-center justify-center text-2xs">MD</span> doc-guia.md <span className="ml-auto text-success">✓</span></div>
                  <div className="flex items-center gap-2 text-2xs text-ink-muted"><span className="w-6 h-4 bg-red-100 rounded-xs border border-line flex items-center justify-center text-2xs">PDF</span> manual.pdf <span className="ml-auto text-success">✓</span></div>
                  <div className="h-1.5 bg-line rounded-full w-3/4"></div>
                </div>
              ),
            },
            {
              title: 'Organiza en colecciones',
              description: 'Agrupa por producto, versión o equipo. Cada colección se mantiene al día sola.',
              illustration: (
                <div className="flex flex-col gap-1 w-full px-4">
                  <div className="h-4 bg-white border border-line rounded-md flex items-center px-2 text-2xs text-ink">Producto A — 12 docs</div>
                  <div className="h-4 bg-white border border-line rounded-md flex items-center px-2 text-2xs text-ink-muted">Equipo — 8 docs</div>
                  <div className="h-4 bg-white/60 border border-line/60 rounded-md flex items-center px-2 text-2xs text-ink-muted">v2.1 — 5 docs</div>
                </div>
              ),
            },
            {
              title: 'Define quién ve qué',
              description: 'Visibilidad por colección: todos, miembros o admins. Retrieval solo con lo autorizado.',
              illustration: (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white border border-line shadow-sm flex items-center justify-center">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xs">✓</span>
                  </div>
                  <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-ink-strong"></span><span className="w-2 h-2 rounded-full bg-ink"></span><span className="w-2 h-2 rounded-full bg-line"></span></div>
                  <div className="text-2xs text-ink-muted">todos · miembros · admins</div>
                </div>
              ),
            },
            {
              title: 'Recupera con contexto',
              description: 'Búsqueda híbrida semántica y por palabras clave sobre lo que el usuario puede ver.',
              illustration: (
                <div className="w-full bg-white border border-line rounded-md px-2 py-1.5 flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-2xs text-ink-muted"><span className="text-accent">⌕</span> ¿cómo ser proveedor?</div>
                  <div className="h-1 bg-accent-subtle rounded-full w-full"></div>
                  <div className="h-1 bg-line rounded-full w-2/3"></div>
                </div>
              ),
            },
            {
              title: 'Responde con citas',
              description: 'Cada respuesta enlaza a su fuente y fragmento exacto. Verificable, siempre.',
              illustration: (
                <div className="w-full bg-white border border-line rounded-md p-2 flex flex-col gap-1.5">
                  <div className="inline-flex items-center rounded-full bg-accent text-surface px-2 py-0.5 text-2xs w-fit">¿Cómo configuro SSO?</div>
                  <div className="flex items-center gap-1 text-2xs text-ink-muted"><span className="w-3 h-3 rounded-xs bg-accent-subtle border border-line"></span> Fuente verificada · <span className="text-emerald-600">Verificada</span></div>
                </div>
              ),
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
