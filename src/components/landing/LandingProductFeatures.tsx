// CO-LANDING-PRODUCT-FEATURES — 6 features grid 3x2 with icons and illustrations
import React from 'react';
import { FeatureCard } from '../ui/FeatureCard';
import { SectionPill } from '../ui/SectionPill';
import { FileText, Shield, Quote, Key, Palette, BarChart3 } from 'lucide-react';

export function LandingProductFeatures() {
  return (
    <section id="producto" className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col gap-10 items-center">
      <div className="max-w-2xl flex flex-col gap-4 text-center items-center">
        <SectionPill label="Producto" />
        <h2 className="text-[32px] lg:text-[36px] font-bold text-ink-strong tracking-tight leading-tight">Todo lo que necesita una capa de conocimiento seria</h2>
        <p className="text-[15px] leading-relaxed text-ink-secondary max-w-xl mx-auto">No es un chatbot con tus PDFs encima. Es retrieval con control de acceso, citas y gobierno del contenido.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 w-full">
        <FeatureCard
          icon={<FileText className="w-4 h-4" />}
          title="Markdown primero"
          description="Editor con vista previa, versionado y sincronización con tu repo Git. Tu documentación sigue siendo tuya, en tu formato."
          illustration={
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-2xs font-mono">
                <span className="bg-accent-subtle text-accent px-1.5 py-0.5 rounded-xs">MD</span> docs/authentication/sso.md <span className="ml-auto bg-success-subtle text-success px-1.5 py-0.5 rounded-xs">v3.2</span>
              </div>
              <div className="h-2 bg-line rounded-sm"></div>
              <div className="h-2 bg-line rounded-sm w-5/6"></div>
              <div className="h-2 bg-accent/30 rounded-sm w-1/2"></div>
            </div>
          }
        />
        <FeatureCard icon={<Shield className="w-4 h-4" />} title="Permisos que se respetan" description="Colecciones, roles y miembros. Los permisos se aplican en la recuperación: el modelo nunca recibe un fragmento no autorizado." />
        <FeatureCard icon={<Quote className="w-4 h-4" />} title="Citas verificables" description="Cada respuesta enlaza a su fuente y al fragmento exacto. Si no hay fuente de la que salga, OKEng te lo dice en lugar de inventar." />
        <FeatureCard
          icon={<Key className="w-4 h-4" />}
          title="Tu modelo, tu clave"
          description="Empieza con nuestros créditos o conecta tu propia clave de proveedor. Cambias de modelo sin reescribir una línea."
          illustration={
            <div className="flex flex-wrap gap-1.5">
              {['OpenAI', 'Anthropic', 'Azure', 'Bedrock', 'Local'].map((m) => (
                <span key={m} className={`text-2xs px-2 py-1 rounded-full border ${m === 'OpenAI' ? 'bg-accent text-surface border-accent' : 'bg-surface border-line text-ink-secondary'}`}>
                  {m}
                </span>
              ))}
            </div>
          }
        />
        <FeatureCard icon={<Palette className="w-4 h-4" />} title="Un widget que parece tuyo" description="Claro, oscuro o con tu marca. Iframe, componente React o pantalla completa: tú eliges cómo se ve en tu producto." />
        <FeatureCard
          icon={<BarChart3 className="w-4 h-4" />}
          title="Analítica de conocimiento"
          description="Cada semana sabrás qué se pregunta, qué se responde mal y qué le falta documentar a tu equipo. El contenido muerto se ve a simple vista."
          illustration={
            <div className="flex items-end gap-1 h-12">
              {[8, 14, 10, 16, 22, 12].map((h, i) => (
                <div key={i} className={`flex-1 rounded-xs ${i === 4 ? 'bg-gradient-to-t from-[#6366F1] to-[#8B5CF6]' : 'bg-line'}`} style={{ height: `${h * 2}px` }}></div>
              ))}
            </div>
          }
        />
      </div>
    </section>
  );
}
