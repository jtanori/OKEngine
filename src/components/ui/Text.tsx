import React from 'react';

// ============================================================================
// UI-01 & 01_ui_foundation.md: Typography Primitive (PR-TEXT)
// ============================================================================

export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'label'
  | 'body'
  | 'caption'
  | 'mono'
  | 'mono-label';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'inverse';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div' | 'label' | 'code';
  variant?: TextVariant;
  tone?: TextTone;
}

const variantClasses: Record<TextVariant, string> = {
  h1: 'text-xl font-semibold tracking-tight leading-snug',
  h2: 'text-sm font-semibold tracking-tight leading-snug',
  h3: 'text-xs font-semibold leading-snug',
  label: 'text-xs font-medium leading-snug',
  body: 'text-xs leading-relaxed',
  caption: 'text-xs leading-normal',
  mono: 'font-mono text-2xs leading-normal',
  'mono-label': 'font-mono text-2xs uppercase tracking-wider font-medium',
};

const toneClasses: Record<TextTone, string> = {
  primary: 'text-ink',
  secondary: 'text-ink-secondary',
  muted: 'text-ink-muted',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  inverse: 'text-surface',
};

export const Text: React.FC<TextProps> = ({
  as,
  variant = 'body',
  tone = 'primary',
  className = '',
  children,
  ...props
}) => {
  const Component =
    as ||
    (variant === 'h1'
      ? 'h1'
      : variant === 'h2'
      ? 'h2'
      : variant === 'h3'
      ? 'h3'
      : variant === 'mono' || variant === 'mono-label'
      ? 'span'
      : 'p');

  return (
    <Component
      className={`${variantClasses[variant]} ${toneClasses[tone]} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};
