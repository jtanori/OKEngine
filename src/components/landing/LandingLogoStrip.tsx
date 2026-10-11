// CO-LANDING-LOGO-STRIP — Logo strip with title (light, no border)
import React from 'react';
import { LogoStrip } from '../ui/LogoStrip';

export function LandingLogoStrip() {
  return (
    <section className="w-full bg-canvas py-10">
      <div className="max-w-7xl mx-auto px-6">
        <LogoStrip title="Usado por equipos que escalan soporte" logos={['Nexora', 'Dataflow', 'Kubelab', 'Aurea', 'Pacted', 'Vanti']} />
      </div>
    </section>
  );
}
