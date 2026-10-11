// PR-AUTH-DIVIDER — Divider with "o" / "or" for SSO vs password
import React from 'react';

export interface AuthDividerProps {
  label?: string;
  className?: string;
}

export function AuthDivider({ label = 'o', className = '' }: AuthDividerProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-px bg-line"></div>
      <span className="text-xs text-ink-muted px-2">{label}</span>
      <div className="flex-1 h-px bg-line"></div>
    </div>
  );
}
