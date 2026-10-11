// PR-SECTION-PILL — Section header pill for landing (DS→PR) — taller per Right target (50% taller)
// Composes Badge pill-accent, DS tokens only
import React from 'react';

export interface SectionPillProps {
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export function SectionPill({ label, icon, className = '' }: SectionPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-accent-subtle border border-accent/10 px-3.5 py-1.5 text-xs font-medium text-accent tracking-wide ${className}`.trim()}
    >
      {icon ? <span className="inline-flex items-center">{icon}</span> : <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
      {label}
    </span>
  );
}
