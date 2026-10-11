// CO-LANDING-PRODUCT-FEATURES — 6 features grid 3x2
import React from 'react';
import { FeatureCard } from '../ui/FeatureCard';

export function LandingProductFeatures() {
  return (
    <section id="producto" className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col gap-12">
      <div className="max-w-3xl flex flex-col gap-3">
        <h2 className="text-section font-semibold text-ink tracking-tight">Todo lo que necesitas para responder con confianza</h2>
        <p className="text-sm text-ink-secondary">Markdown primero, permisos por rol, citas verificables, tu modelo tu clave, widget que parece tuyo, analítica.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <FeatureCard title="Markdown primero" description="Tu documentación como fuente de verdad. MD, MDX, PDF, URLs. Sincronización automática, re-index." />
        <FeatureCard title="Permisos por rol" description="Control granular: todos, miembros, admins. Hereda de tu app vía SSO. Filtrado en retrieval, no solo UI." />
        <FeatureCard title="Citas verificables" description="≥98% de respuestas con fuente. Cada afirmación trazable al doc original. Sin alucinaciones." />
        <FeatureCard title="Tu modelo, tu clave" description="OpenAI, Anthropic, Azure, Bedrock, o local. Trae tu propia API key. Datos nunca usados para entrenar." />
        <FeatureCard title="Widget que parece tuyo" description="100% personalizable: colores, fuentes, posición. Parece parte de tu producto, no un añadido. 3 líneas de código." />
        <FeatureCard title="Analítica de uso" description="Qué preguntan, qué falta, qué fuentes usan. Mejora continua de tu base de conocimiento." />
      </div>
    </section>
  );
}
