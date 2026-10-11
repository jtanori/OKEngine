// PR-AUTH-CARD — Centered card container with logo, title, subtitle, form, footer
// DS tokens: bg-surface, border-line, rounded-xl 16px, shadow-md, bg-canvas — v3.3 split uses rounded-xl + hideLogo
import React from 'react';

export interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  trustFooter?: React.ReactNode;
  className?: string;
  hideLogo?: boolean;
  variant?: 'card' | 'borderless';
}

export function AuthCard({ title, subtitle, children, footer, trustFooter, className = '', hideLogo = false, variant = 'card' }: AuthCardProps) {
  if (variant === 'borderless') {
    return (
      <div className={`w-full max-w-[440px] mx-auto flex flex-col gap-6 ${className}`}>
        <div className="flex flex-col gap-2">
          {!hideLogo && (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-sm bg-ink text-surface flex items-center justify-center text-2xs font-bold">O</div>
              <span className="text-sm font-semibold text-ink">OKEng</span>
            </div>
          )}
          <h1 className="text-auth-title font-semibold text-ink tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-secondary leading-relaxed">{subtitle}</p>}
        </div>
        <div className="flex flex-col gap-4">{children}</div>
        {footer && <div className="pt-4 border-t border-line text-center">{footer}</div>}
        {trustFooter && <div className="text-center">{trustFooter}</div>}
      </div>
    );
  }
  return (
    <div className={`w-full max-w-md mx-auto flex flex-col gap-6 ${className}`}>
      <div className="bg-surface border border-line rounded-xl shadow-md p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          {!hideLogo && (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-sm bg-ink text-surface flex items-center justify-center text-2xs font-bold">O</div>
              <span className="text-sm font-semibold text-ink">OKEng</span>
            </div>
          )}
          <h1 className="text-xl font-semibold text-ink tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-secondary leading-relaxed">{subtitle}</p>}
        </div>
        <div className="flex flex-col gap-4">{children}</div>
        {footer && <div className="pt-2 border-t border-line text-center">{footer}</div>}
      </div>
      {trustFooter && <div className="text-center">{trustFooter}</div>}
    </div>
  );
}
