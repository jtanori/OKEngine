// CO-LANDING-INTEGRATION — 3 modes tabs + preview
import React from 'react';
import { IntegrationTabs } from '../ui/IntegrationTabs';

export function LandingIntegration() {
  return (
    <section id="integracion" className="w-full bg-surface border-y border-line py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-12">
        <div className="max-w-3xl flex flex-col gap-3">
          <h2 className="text-section font-semibold text-ink tracking-tight">Se adapta a cómo usas tu producto</h2>
          <p className="text-sm text-ink-secondary">Widget flotante, panel lateral o pantalla completa. Elige la experiencia.</p>
        </div>
        <IntegrationTabs
          modes={[
            {
              id: 'widget',
              label: 'Widget flotante',
              description: 'Ideal para ayuda contextual sin salir del flujo. 3 líneas de código. Flota abajo-derecha, chat con citas.',
              code: `<OKEngWidget\n  collection="docs"\n  mode="widget"\n  theme={{ accent: "#1D4ED8" }}\n/>`,
            },
            {
              id: 'panel',
              label: 'Panel lateral',
              description: 'Documentación y chat en un panel deslizable. Perfecto para dashboards. 360px, max 40%.',
              code: `<OKEngWidget\n  collection="docs"\n  mode="panel"\n  width="360px"\n/>`,
            },
            {
              id: 'fullscreen',
              label: 'Pantalla completa',
              description: 'Base de conocimiento completa. Para centros de ayuda dedicados. Búsqueda + filtros + respuestas.',
              code: `<OKEngWidget\n  collection="docs"\n  mode="fullscreen"\n  permissions={{ role: user.role }}\n/>`,
            },
          ]}
        />
      </div>
    </section>
  );
}
