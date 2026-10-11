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
      className={`w-full bg-ink-strong text-surface border-0 px-4 py-2 text-center text-xs leading-6 ${className}`}
      role="banner"
    >
      <div className="mx-auto max-w-7xl flex items-center justify-center gap-2">
        {icon && <span className="inline-flex items-center text-surface">{icon}</span>}
        <span className="font-medium tracking-wide">{children}</span>
      </div>
    </div>
  );
}
