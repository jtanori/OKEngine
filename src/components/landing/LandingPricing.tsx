// CO-LANDING-PRICING — Pricing 3 tiers + toggle — entitlements via PLAN_LIMITS single source (P2 audit)
// Do not hardcode limits here — import from src/lib/billing.ts to keep UI and enforcement in sync.
import React, { useState } from 'react';
import { PricingToggle } from '../ui/PricingToggle';
import { PricingCard } from '../ui/PricingCard';
import { SectionPill } from '../ui/SectionPill';
import { PLAN_LIMITS } from '../../lib/billing';

// Pricing display — derived, 20% discount verified
export const PRICING = {
  pro: {
    monthly: 39,
    annual: 31, // 39 * 0.8 = 31.2 → 31 (20% off)
    currency: '€',
    getDisplay: (interval: 'monthly' | 'annual') => (interval === 'annual' ? 31 : 39),
    getLabel: (interval: 'monthly' | 'annual') => (interval === 'annual' ? '/mes facturado anualmente' : '/mes'),
    discountPercent: 20,
  },
} as const;

export function LandingPricing() {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('annual');

  const isAnnual = interval === 'annual';
  const proDisplayPrice = PRICING.pro.getDisplay(interval);
  const proPriceLabel = PRICING.pro.getLabel(interval);

  return (
    <section id="precios" className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-3xl mx-auto">
        <SectionPill label="Precios" />
        <h2 className="text-section font-bold text-ink-strong tracking-tight">Empieza gratis. Paga cuando escale.</h2>
        <p className="text-sm text-ink-secondary">Sin costes de infraestructura ocultos. Si tu uso crece, te avisamos antes de facturar nada.</p>
        <PricingToggle interval={interval} onChange={setInterval} />
        <p className="text-xs text-ink-muted">Precios en EUR, sin IVA. Cancela cuando quieras. {isAnnual && `Ahorras ${PRICING.pro.discountPercent}% frente a pago mensual.`}</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 items-start w-full">
        <PricingCard
          name="Starter"
          price="0€"
          description="Para probar y proyectos personales"
          priceNote=""
          features={[
            `${PLAN_LIMITS.starter.maxCollections} colección y ${PLAN_LIMITS.starter.maxFiles} archivos`,
            `${PLAN_LIMITS.starter.maxQueriesPerMonth.toLocaleString('es-ES')} consultas al mes`,
            'Widget flotante con marca OKEng',
            'Citas verificables incluidas',
            'Soporte de la comunidad',
          ]}
          ctaLabel="Empieza gratis"
          ctaHref="/signup?plan=starter"
        />
        <PricingCard
          name="Pro"
          price={`${proDisplayPrice}€`}
          priceNote={proPriceLabel}
          description="Para equipos de producto en serio"
          features={[
            `${PLAN_LIMITS.pro.maxCollections} colecciones y ${PLAN_LIMITS.pro.maxFiles.toLocaleString('es-ES')} archivos`,
            `${PLAN_LIMITS.pro.maxQueriesPerMonth.toLocaleString('es-ES')} consultas al mes`,
            'Permisos por colección, rol y miembro',
            'Widget, panel o pantalla completa',
            'Sin marca · tu dominio y tu tema',
            'Tu propia clave de proveedor de IA',
            'Analítica de conocimiento',
          ]}
          ctaLabel="Empieza con Pro"
          ctaHref={`/signup?plan=pro&interval=${interval}`}
          popular
        />
        <PricingCard
          name="Escala"
          price="A medida"
          description="Según volumen y requisitos"
          features={['Todo lo del plan Pro', 'SSO / SAML y auditoría de accesos', 'Despliegue on-premise o en la UE', 'SLA 99,9%* y soporte dedicado', 'Formación y migración asistida']}
          ctaLabel="Hablar con ventas"
          ctaHref="/contact?plan=escala"
        />
      </div>
      <p className="text-2xs text-ink-muted text-center">* El 99,9% es objetivo de disponibilidad, no SLA contractual salvo acuerdo Escala. Ver condiciones.</p>
      <div className="w-full bg-surface border border-line rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-ink">¿Muchas consultas o requisitos especiales?</div>
          <div className="text-xs text-ink-secondary">A partir de 100.000 consultas al mes ajustamos precio y rendimiento a tu caso.</div>
        </div>
        <a href="/contact?plan=enterprise" className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium shadow-sm hover:bg-elevated">
          Consultar sin compromiso
        </a>
      </div>
    </section>
  );
}
