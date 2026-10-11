// CO-LANDING-PRICING — Pricing 3 tiers + toggle
import React, { useState } from 'react';
import { PricingToggle } from '../ui/PricingToggle';
import { PricingCard } from '../ui/PricingCard';

export function LandingPricing() {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');

  const isAnnual = interval === 'annual';

  return (
    <section id="precios" className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col gap-12">
      <div className="flex flex-col items-center gap-6 text-center max-w-3xl mx-auto">
        <h2 className="text-section font-semibold text-ink tracking-tight">Precios simples, que escalan contigo</h2>
        <p className="text-sm text-ink-secondary">Empieza gratis, sin tarjeta. Cancela cuando quieras. Precios en EUR.</p>
        <PricingToggle interval={interval} onChange={setInterval} />
      </div>
      <div className="grid md:grid-cols-3 gap-6 items-start">
        <PricingCard
          name="Starter"
          price="0€"
          priceNote="/mes"
          description="Para empezar, 1.000 consultas gratis."
          features={['1.000 consultas/mes', '1 colección', '100 archivos', 'Widget flotante + Panel lateral', 'Soporte comunitario']}
          ctaLabel="Empieza gratis"
          ctaHref="/signup?plan=starter"
        />
        <PricingCard
          name="Pro"
          price={isAnnual ? '24€' : '31€'}
          priceNote={isAnnual ? '/mes facturado anual' : '/mes'}
          description="Para equipos que escalan soporte."
          features={['10.000 consultas/mes', '10 colecciones', '1.000 archivos', 'Todo en Starter +', 'Permisos por rol + SSO', 'Analítica de uso', 'Soporte prioritario']}
          ctaLabel="Empieza con Pro"
          ctaHref={`/signup?plan=pro&interval=${interval}`}
          popular
        />
        <PricingCard
          name="Escala"
          price="A medida"
          description="Para grandes volúmenes y requisitos enterprise."
          features={['Consultas ilimitadas', 'Colecciones ilimitadas', 'Archivos ilimitados', 'Todo en Pro +', 'On-premise + SLA', 'Soporte dedicado + BYOK', 'Despliega en UE + Webhooks']}
          ctaLabel="Habla con nosotros"
          ctaHref="/contact?plan=escala"
        />
      </div>
      <div className="text-center text-xs text-ink-muted">
        {isAnnual ? 'Ahorra 20% con facturación anual. ' : ''}Sin tarjeta • Cancela cuando quieras • Soporte ES/EN •{' '}
        <a href="#faq" className="underline hover:text-ink">Ver FAQ</a>
      </div>
    </section>
  );
}
