// PR-PRICING-CARD — Pricing tier card with features, CTA, popular badge
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
    <div className={`bg-surface border rounded-lg p-6 flex flex-col gap-4 ${popular ? 'border-ink shadow-md relative' : 'border-line shadow-sm'} ${className}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ink text-surface text-2xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
          Más popular
        </div>
      )}
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-ink">{name}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-ink">{price}</span>
          {priceNote && <span className="text-xs text-ink-secondary">{priceNote}</span>}
        </div>
        <div className="text-xs text-ink-secondary">{description}</div>
      </div>
      <div className="h-px bg-line"></div>
      <ul className="flex flex-col gap-2 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-ink-secondary">
            <span className="text-success mt-0.5">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={ctaHref}
        className={`mt-auto inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
          popular ? 'bg-ink text-surface hover:bg-ink-strong' : 'bg-surface border border-line text-ink hover:bg-elevated'
        }`}
      >
        {ctaLabel}
      </a>
    </div>
  );
}
