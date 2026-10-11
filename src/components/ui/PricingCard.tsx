// PR-PRICING-CARD — Pricing tier card with features, CTA, popular badge — structure per Right target: name → description → large price/mes → facturado copy → CTA → benefits
// DS tokens: bg-surface, border-line, rounded-lg, shadow-sm/md, text-ink, accent
import React from 'react';

export interface PricingCardProps {
  name: string;
  price: string;
  priceNote?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  popular?: boolean;
  className?: string;
}

export function PricingCard({ name, price, priceNote, description, features, ctaLabel, ctaHref, popular = false, className = '' }: PricingCardProps) {
  return (
    <div className={`border rounded-xl p-6 flex flex-col gap-5 relative ${popular ? 'bg-ink-strong text-surface border-ink-strong shadow-xl' : 'bg-surface border-line shadow-sm'} ${className}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-surface text-2xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <span>✦</span> Más popular
        </div>
      )}
      {/* Name + description (before price) */}
      <div className="flex flex-col gap-1">
        <div className={`text-sm font-semibold ${popular ? 'text-surface' : 'text-ink'}`}>{name}</div>
        <div className={`text-xs leading-relaxed ${popular ? 'text-white/60' : 'text-ink-secondary'}`}>{description}</div>
      </div>
      {/* Large price + priceNote (facturado) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-bold tracking-tight ${popular ? 'text-surface' : 'text-ink'}`}>{price}</span>
        </div>
        {priceNote ? (
          <div className={`text-xs ${popular ? 'text-white/60' : 'text-ink-muted'}`}>{priceNote === '/mes facturado anualmente' ? 'Facturado anualmente · 2 meses gratis' : priceNote === '/mes' ? 'al mes' : priceNote}</div>
        ) : price === '0€' ? (
          <div className={`text-xs ${popular ? 'text-white/60' : 'text-ink-muted'}`}>Gratis para siempre, sin tarjeta</div>
        ) : price === 'A medida' ? (
          <div className={`text-xs ${popular ? 'text-white/60' : 'text-ink-muted'}`}>Según volumen y requisitos</div>
        ) : null}
      </div>
      {/* CTA before benefits */}
      <a
        href={ctaHref}
        className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-colors shadow-sm ${
          popular ? 'bg-white text-ink-strong hover:bg-white/90' : 'bg-surface border border-line text-ink hover:bg-elevated'
        }`}
      >
        {ctaLabel} →
      </a>
      <div className={`h-px ${popular ? 'bg-white/10' : 'bg-line'}`} />
      {/* Benefits after CTA */}
      <ul className="flex flex-col gap-2.5 flex-1">
        {features.map((f, i) => (
          <li key={i} className={`flex items-start gap-2 text-xs leading-relaxed ${popular ? 'text-white/80' : 'text-ink-secondary'}`}>
            <span className="text-success mt-0.5 text-xs">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
