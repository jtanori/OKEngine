import React from 'react';

// ============================================================================
// UI-01 & 01_ui_foundation.md: Empty State Primitive (PR-EMPTY-STATE)
// ============================================================================

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={`p-10 bg-surface border border-line rounded-sm text-center space-y-2.5 ${className}`.trim()}
  >
    {icon && <div className="flex justify-center text-ink-muted">{icon}</div>}
    <div className="text-xs font-medium text-ink">{title}</div>
    {description && <p className="text-2xs text-ink-secondary max-w-md mx-auto">{description}</p>}
    {action && <div className="pt-2 flex justify-center">{action}</div>}
  </div>
);
