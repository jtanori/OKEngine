// PR-PRICING-TOGGLE — Monthly/Annual toggle with -20% badge
// DS tokens: bg-elevated, bg-surface, border-line, text-ink, accent, rounded-sm
import React from 'react';

export interface PricingToggleProps {
  interval: 'monthly' | 'annual';
  onChange: (interval: 'monthly' | 'annual') => void;
  className?: string;
}

export function PricingToggle({ interval, onChange, className = '' }: PricingToggleProps) {
  return (
    <div className={`inline-flex items-center gap-1 rounded-sm bg-elevated p-0.5 border border-line ${className}`} role="group" aria-label="Billing interval">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={`rounded-xs px-4 py-1.5 text-sm font-medium transition-colors ${
          interval === 'monthly' ? 'bg-surface text-ink shadow-sm border border-line' : 'text-ink-secondary hover:text-ink'
        }`}
        aria-pressed={interval === 'monthly'}
      >
        Mensual
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        className={`rounded-xs px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-2 ${
          interval === 'annual' ? 'bg-surface text-ink shadow-sm border border-line' : 'text-ink-secondary hover:text-ink'
        }`}
        aria-pressed={interval === 'annual'}
      >
        Anual
        <span className="inline-flex items-center rounded-xs bg-success-subtle px-1.5 py-0.5 text-2xs font-semibold text-success">-20%</span>
      </button>
    </div>
  );
}
