// PR-TRUST-BADGE — Small badge "Sin tarjeta", "Cancela cuando quieras", "≥98% con cita"
import React from 'react';

export interface TrustBadgeProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function TrustBadge({ children, icon, className = '' }: TrustBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-2xs text-ink-muted ${className}`}>
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export interface TrustFooterProps {
  badges: string[];
  className?: string;
}

export function TrustFooter({ badges, className = '' }: TrustFooterProps) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      {badges.map((b, i) => (
        <React.Fragment key={i}>
          <TrustBadge>{b}</TrustBadge>
          {i < badges.length - 1 && <span className="text-ink-muted text-2xs">•</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
