import React from 'react';

// ============================================================================
// UI-01 & 01_ui_foundation.md: Structural Primitives (PR-CARD, PR-BOX, PR-DIVIDER)
// Enforces the Interaction Affordance Invariant (§2.7):
//   Interactive hover/cursor affordances are applied only when an interactive card
//   has an active click target, and keyboard activation (Enter/Space) is bound.
// ============================================================================

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  surface?: 'default' | 'canvas' | 'surface' | 'elevated' | 'subtle' | 'accent' | 'success' | 'warning' | 'danger' | 'ink';
  bordered?: boolean;
  radius?: 'none' | 'xs' | 'sm' | 'md';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
}

const surfaceMap: Record<NonNullable<BoxProps['surface']>, string> = {
  default: 'bg-canvas text-ink',
  canvas: 'bg-canvas text-ink',
  surface: 'bg-surface text-ink',
  elevated: 'bg-elevated text-ink',
  subtle: 'bg-subtle text-ink',
  accent: 'bg-accent-subtle text-accent',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  ink: 'bg-ink text-surface',
};

const borderMap: Record<NonNullable<BoxProps['surface']>, string> = {
  default: 'border-line',
  canvas: 'border-line',
  surface: 'border-line',
  elevated: 'border-line',
  subtle: 'border-line',
  accent: 'border-accent/25',
  success: 'border-success/30',
  warning: 'border-warning/30',
  danger: 'border-danger/30',
  ink: 'border-ink',
};

const radiusMap: Record<NonNullable<BoxProps['radius']>, string> = {
  none: 'rounded-none',
  xs: 'rounded-xs',
  sm: 'rounded-sm',
  md: 'rounded-md',
};

const paddingMap: Record<NonNullable<BoxProps['padding']>, string> = {
  none: '',
  xs: 'p-2.5',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  (
    {
      surface = 'surface',
      bordered = true,
      radius = 'sm',
      padding = 'none',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`${surfaceMap[surface]} ${bordered ? `border ${borderMap[surface]}` : ''} ${radiusMap[radius]} ${paddingMap[padding]} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Box.displayName = 'Box';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'elevated' | 'subtle' | 'warning' | 'danger' | 'success';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'surface',
      padding = 'md',
      interactive = false,
      onClick,
      onKeyDown,
      role,
      tabIndex,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isActionable = interactive && Boolean(onClick);
    const interactiveClasses = isActionable
      ? 'hover:border-ink transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
      : '';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (isActionable && onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
      onKeyDown?.(e);
    };

    return (
      <Box
        ref={ref}
        surface={variant}
        bordered
        radius="sm"
        padding={padding}
        onClick={onClick}
        onKeyDown={isActionable ? handleKeyDown : onKeyDown}
        role={isActionable ? role ?? 'button' : role}
        tabIndex={isActionable ? tabIndex ?? 0 : tabIndex}
        className={`${interactiveClasses} ${className}`.trim()}
        {...props}
      >
        {children}
      </Box>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, icon, actions, className = '' }) => (
  <div className={`flex items-start justify-between border-b border-line pb-3 gap-3 ${className}`.trim()}>
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-ink">
        {icon}
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-ink-secondary">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Divider: React.FC<{
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}> = ({ orientation = 'horizontal', className = '' }) =>
  orientation === 'vertical' ? (
    <div role="separator" className={`w-px h-4 bg-line shrink-0 ${className}`.trim()} />
  ) : (
    <hr className={`border-0 border-t border-line ${className}`.trim()} />
  );
