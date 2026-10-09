import React from 'react';
import { AccessVisibility, DocumentStatus } from '../../types';
import { useI18n } from '../../i18n/I18nContext';

// ============================================================================
// UI-01 & 01_ui_foundation.md: Badge, Status & Metadata Primitives (PR-BADGE)
// ============================================================================

export type BadgeTone =
  | 'neutral'
  | 'ink'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'solid-success'
  | 'solid-warning'
  | 'solid-accent'
  | 'solid-danger';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeTone;
  mono?: boolean;
  uppercase?: boolean;
}

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-elevated text-ink-secondary border-line',
  ink: 'bg-ink text-surface border-ink',
  accent: 'bg-accent-subtle text-accent border-accent/25',
  success: 'bg-success-subtle text-success border-success/30',
  warning: 'bg-warning-subtle text-warning border-warning/30',
  danger: 'bg-danger-subtle text-danger border-danger/30',
  'solid-success': 'bg-success text-surface border-success font-medium shadow-2xs',
  'solid-warning': 'bg-warning text-surface border-warning font-medium shadow-2xs',
  'solid-accent': 'bg-accent text-surface border-accent font-medium shadow-2xs',
  'solid-danger': 'bg-danger text-surface border-danger font-medium shadow-2xs',
};

export const Badge: React.FC<BadgeProps> = ({
  tone,
  variant,
  mono = true,
  uppercase = false,
  className = '',
  children,
  ...props
}) => {
  const resolvedTone: BadgeTone = tone ?? variant ?? 'neutral';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-2xs border ${
        mono ? 'font-mono' : 'font-sans'
      } ${uppercase ? 'uppercase tracking-wider' : ''} ${badgeToneClasses[resolvedTone]} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
};

export const MetadataLine: React.FC<{
  items: (string | React.ReactNode)[];
  className?: string;
}> = ({ items, className = '' }) => {
  const filtered = items.filter(Boolean);
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 text-2xs text-ink-muted font-mono tabular-nums ${className}`.trim()}
    >
      {filtered.map((item, idx) => (
        <React.Fragment key={idx}>
          <span>{item}</span>
          {idx < filtered.length - 1 && <span className="text-line-strong">•</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

export const StatusIndicator: React.FC<{
  status: DocumentStatus;
  variant?: 'inline' | 'solid';
}> = ({ status, variant = 'inline' }) => {
  const { t } = useI18n();
  const config: Record<
    DocumentStatus,
    { label: string; dotColor: string; textColor: string; solidClasses: string }
  > = {
    uploading: {
      label: t('common.uploading', 'Uploading'),
      dotColor: 'bg-accent animate-pulse',
      textColor: 'text-ink-secondary',
      solidClasses: 'bg-accent text-surface border-accent',
    },
    processing: {
      label: t('common.processing', 'Processing'),
      dotColor: 'bg-warning animate-pulse',
      textColor: 'text-warning',
      solidClasses: 'bg-warning text-surface border-warning',
    },
    ready: {
      label: t('common.ready', 'Ready'),
      dotColor: 'bg-success',
      textColor: 'text-ink',
      solidClasses: 'bg-success text-surface border-success',
    },
    failed: {
      label: t('common.failed', 'Failed'),
      dotColor: 'bg-danger',
      textColor: 'text-danger',
      solidClasses: 'bg-danger text-surface border-danger',
    },
  };

  const current = config[status];

  if (variant === 'solid') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs text-2xs font-mono font-medium border shadow-2xs ${current.solidClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-surface" />
        <span>{current.label}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${current.textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor}`} />
      <span>{current.label}</span>
    </span>
  );
};

export const AccessBadge: React.FC<{ visibility: AccessVisibility }> = ({ visibility }) => {
  const { t } = useI18n();
  const config: Record<AccessVisibility, { label: string; classes: string }> = {
    everyone: {
      label: t('common.everyone', 'Public'),
      classes: 'bg-subtle text-ink border-line',
    },
    members: {
      label: t('common.members', 'Members'),
      classes: 'bg-accent-subtle text-accent border-accent/25',
    },
    admins: {
      label: t('common.admins', 'Admins'),
      classes: 'bg-warning-subtle text-warning border-warning/30',
    },
  };

  const current = config[visibility];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-xs text-2xs font-medium border font-mono uppercase tracking-wider ${current.classes}`}
    >
      {current.label}
    </span>
  );
};
