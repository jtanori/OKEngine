import React from 'react';
import { Loader2 } from 'lucide-react';

// ============================================================================
// UI-01 §2.1 & DS-CONTROL-HEIGHT: Strict Button Primitive (PR-BUTTON)
// Canonical 4-Tier Control Height Scale:
//   - xs: 24px (h-6)  — Dense table row actions and inline chips
//   - sm: 32px (h-8)  — Filter bars (PR-FILTER-BAR), simulation toolbars, child navbars
//   - md: 36px (h-9)  — Standard form submit actions and PageHeader CTAs (default)
//   - lg: 40px (h-10) — Prominent hero and authentication actions
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-surface border border-ink hover:bg-ink/90 active:bg-ink/95',
  secondary:
    'bg-surface text-ink border border-line hover:bg-subtle active:bg-elevated',
  ghost:
    'bg-transparent text-ink-secondary border border-transparent hover:bg-subtle hover:text-ink',
  danger:
    'bg-danger-subtle text-danger border border-danger/30 hover:bg-danger hover:text-surface',
  accent:
    'bg-accent text-surface border border-accent hover:bg-accent-hover',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-2xs gap-1',
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-xs gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium rounded-sm transition-colors duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
