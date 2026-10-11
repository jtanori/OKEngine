// PR-PRICING-TOGGLE — Monthly/Annual toggle with -20% badge — segmented dark active like IntegrationTabs
// DS tokens: bg-elevated, border-line, rounded-full, text-ink, accent
import React from 'react';

export interface PricingToggleProps {
  interval: 'monthly' | 'annual';
  onChange: (interval: 'monthly' | 'annual') => void;
  className?: string;
}

export function PricingToggle({ interval, onChange, className = '' }: PricingToggleProps) {
  return (
    <div className={`inline-flex items-center gap-1 rounded-full bg-elevated p-1 border border-line shadow-sm ${className}`} role="group" aria-label="Billing interval">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
          interval === 'monthly' ? 'bg-ink-strong text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
        }`}
        aria-pressed={interval === 'monthly'}
      >
        Mensual
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        className={`rounded-full px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
          interval === 'annual' ? 'bg-ink-strong text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
        }`}
        aria-pressed={interval === 'annual'}
      >
        Anual
        <span className="inline-flex items-center rounded-full bg-emerald-500 text-white px-2 py-0.5 text-2xs font-semibold">-20%</span>
      </button>
    </div>
  );
}
