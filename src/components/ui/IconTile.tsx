// PR-ICON-TILE — Small icon tile for FeatureCard / Integration bullets (DS→PR)
import React from 'react';

export interface IconTileProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export function IconTile({ children, className = '', size = 'md' }: IconTileProps) {
  const sizeCls = size === 'sm' ? 'w-7 h-7 rounded-md' : 'w-9 h-9 rounded-lg';
  return (
    <span
      className={`inline-flex items-center justify-center bg-accent-subtle text-accent border border-accent/10 ${sizeCls} shrink-0 ${className}`.trim()}
    >
      {children}
    </span>
  );
}
