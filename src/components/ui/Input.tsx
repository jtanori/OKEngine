import React, { useId } from 'react';

// ============================================================================
// UI-01 §2.1 & DS-CONTROL-HEIGHT: Standard Input & Textarea Primitives (PR-INPUT / PR-TEXTAREA)
// Canonical 4-Tier Control Height Scale:
//   - sm: 32px (h-8)  — Filter bars (PR-FILTER-BAR), simulation toolbars, compact headers
//   - md: 36px (h-9)  — Standard standalone form controls, drawers, and dialogs (default)
//   - lg: 40px (h-10) — Prominent hero and authentication form inputs
// ============================================================================

export type InputSizeVariant = 'sm' | 'md' | 'lg';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string | null;
  error?: string | null;
  mono?: boolean;
  sizeVariant?: InputSizeVariant;
  leadingIcon?: React.ReactNode;
  trailingElement?: React.ReactNode;
  containerClassName?: string;
}

const sizeClasses: Record<InputSizeVariant, string> = {
  sm: 'h-8 text-xs',
  md: 'h-9 text-xs',
  lg: 'h-10 text-sm',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      mono = false,
      sizeVariant = 'md',
      leadingIcon,
      trailingElement,
      containerClassName = '',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;
    const hasAuxiliaryText = Boolean(label || hint || error);
    const hasCustomWidth = /\bw-[^\s]+/.test(className);

    const horizontalPadding = `${leadingIcon ? 'pl-8' : 'pl-3'} ${
      trailingElement ? 'pr-8' : 'pr-3'
    }`;

    const inputElement = (
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`${hasCustomWidth ? '' : 'w-full'} ${sizeClasses[sizeVariant]} ${horizontalPadding} bg-elevated border rounded-sm text-ink placeholder:text-ink-muted transition-colors focus:outline-none focus:bg-surface disabled:opacity-50 disabled:cursor-not-allowed ${
          mono ? 'font-mono' : 'font-sans'
        } ${
          error
            ? 'border-danger focus:border-danger'
            : 'border-line focus:border-ink'
        } ${className}`.trim()}
        {...props}
      />
    );

    if (!hasAuxiliaryText) {
      return (
        <div
          className={`relative flex items-center ${
            hasCustomWidth ? 'w-auto' : 'w-full'
          } ${containerClassName}`.trim()}
        >
          {leadingIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-ink-muted">
              {leadingIcon}
            </span>
          )}
          {inputElement}
          {trailingElement && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink-muted">
              {trailingElement}
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        className={`${
          hasCustomWidth ? 'w-auto' : 'w-full'
        } space-y-1.5 ${containerClassName}`.trim()}
      >
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-ink select-none"
          >
            {label}
          </label>
        )}
        {leadingIcon || trailingElement ? (
          <div className={`relative flex items-center ${hasCustomWidth ? 'w-auto' : 'w-full'}`}>
            {leadingIcon && (
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-ink-muted">
                {leadingIcon}
              </span>
            )}
            {inputElement}
            {trailingElement && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink-muted">
                {trailingElement}
              </span>
            )}
          </div>
        ) : (
          inputElement
        )}
        {error ? (
          <p id={errorId} role="alert" className="text-2xs text-danger leading-normal">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-2xs text-ink-secondary leading-normal">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string | null;
  error?: string | null;
  mono?: boolean;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      mono = false,
      containerClassName = '',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const hintId = `${textareaId}-hint`;
    const errorId = `${textareaId}-error`;
    const hasAuxiliaryText = Boolean(label || hint || error);

    return (
      <div
        className={`w-full ${
          hasAuxiliaryText ? 'space-y-1.5' : ''
        } ${containerClassName}`.trim()}
      >
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium text-ink select-none"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full p-3 bg-elevated border rounded-sm text-xs text-ink placeholder:text-ink-muted transition-colors focus:outline-none focus:bg-surface disabled:opacity-50 disabled:cursor-not-allowed ${
            mono ? 'font-mono leading-relaxed' : 'font-sans leading-normal'
          } ${
            error
              ? 'border-danger focus:border-danger'
              : 'border-line focus:border-ink'
          } ${className}`.trim()}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-2xs text-danger leading-normal">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-2xs text-ink-secondary leading-normal">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
