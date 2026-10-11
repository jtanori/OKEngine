// PR-PUBLIC-PAGE — Editorial public page container max-w-7xl py-16/24 centered, warm canvas, quiet technical
import React from 'react';

export interface PublicPageProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '7xl';
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export function PublicPage({ title, subtitle, children, maxWidth = '3xl', className = '' }: PublicPageProps) {
  return (
    <div className={`min-h-screen bg-canvas ${className}`}>
      <div className={`${maxWidthMap[maxWidth]} mx-auto px-6 py-16 md:py-24 flex flex-col gap-8`}>
        {(title || subtitle) && (
          <div className="flex flex-col gap-3">
            {title && <h1 className="text-section font-semibold tracking-tight text-ink-strong">{title}</h1>}
            {subtitle && <p className="text-sm text-ink-secondary max-w-2xl leading-relaxed">{subtitle}</p>}
          </div>
        )}
        <div className="flex flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
