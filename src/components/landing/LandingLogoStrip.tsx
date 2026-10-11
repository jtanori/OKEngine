// CO-LANDING-LOGO-STRIP — Logo strip with title (light, no border)
import React from 'react';
import { LogoStrip } from '../ui/LogoStrip';

export function LandingLogoStrip() {
  return (
    <section className="w-full bg-canvas py-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-5">
        <div className="text-center text-xs tracking-[0.14em] uppercase text-ink-muted font-medium">Equipos de producto que ya responden con OKEng</div>
        <LogoStrip title="" logos={['◆ Nexora', '• Dataflow', '▲ Kubelab', '■ Aurea', '✦ Pacted', '○ Vanti']} />
      </div>
    </section>
  );
}
