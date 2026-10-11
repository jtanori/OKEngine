// PR-FEATURE-CARD — Feature card icon + title + desc for 6 features
// DS tokens: bg-surface, border-line, rounded-lg, shadow-sm, text-ink
import React from 'react';

export interface FeatureCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon, title, description, className = '' }: FeatureCardProps) {
  return (
    <div className={`bg-surface border border-line rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 ${className}`}>
      {icon && <div className="h-8 w-8 rounded-sm bg-accent-subtle flex items-center justify-center text-accent text-sm">{icon}</div>}
      <div className="text-card-title font-semibold text-ink">{title}</div>
      <div className="text-sm text-ink-secondary leading-relaxed">{description}</div>
    </div>
  );
}
