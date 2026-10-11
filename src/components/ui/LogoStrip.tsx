// PR-LOGO-STRIP — Logo strip 6 logos monochrome
// DS tokens: text-ink-muted, border-line
import React from 'react';

export interface LogoStripProps {
  title?: string;
  logos: string[];
  className?: string;
}

export function LogoStrip({ title, logos, className = '' }: LogoStripProps) {
  return (
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      {title && <div className="text-xs font-medium uppercase tracking-wider text-ink-muted">{title}</div>}
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60">
        {logos.map((logo, idx) => (
          <div key={idx} className="text-sm font-semibold text-ink-muted tracking-wide">
            {logo}
          </div>
        ))}
      </div>
    </div>
  );
}
