// PR-FEATURE-CARD — Feature card icon + title + desc for 6 features, optional illustration
// DS tokens: bg-surface, border-line, rounded-xl, shadow-sm, text-ink, IconTile
import React from 'react';
import { IconTile } from './IconTile';

export interface FeatureCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  illustration?: React.ReactNode;
  className?: string;
}

export function FeatureCard({ icon, title, description, illustration, className = '' }: FeatureCardProps) {
  return (
    <div className={`bg-surface border border-line rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 ${className}`}>
      {icon && <IconTile>{icon}</IconTile>}
      <div className="text-card-title font-semibold text-ink">{title}</div>
      <div className="text-sm text-ink-secondary leading-relaxed">{description}</div>
      {illustration && <div className="mt-1 p-3 bg-elevated border border-line rounded-lg">{illustration}</div>}
    </div>
  );
}
