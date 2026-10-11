// PR-ANNOUNCEMENT-BANNER — Top full-width announcement banner for landing
// DS tokens: bg-subtle, border-line, text-ink, text-ink-secondary, rounded-sm
import React from 'react';

export interface AnnouncementBannerProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function AnnouncementBanner({ children, icon, className = '' }: AnnouncementBannerProps) {
  return (
    <div
      className={`w-full bg-subtle border-b border-line px-4 py-2.5 text-center text-xs text-ink-secondary ${className}`}
      role="banner"
    >
      <div className="mx-auto max-w-7xl flex items-center justify-center gap-2">
        {icon && <span className="inline-flex items-center">{icon}</span>}
        <span className="font-medium tracking-wide">{children}</span>
      </div>
    </div>
  );
}
