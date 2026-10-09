import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

// ============================================================================
// UI-01 §2.1 & DS-CONTROL-HEIGHT: Accessible Native Select Primitive (PR-SELECT)
// Canonical 4-Tier Control Height Scale:
//   - sm: 32px (h-8)  — Filter bars (PR-FILTER-BAR), simulation toolbars, compact headers
//   - md: 36px (h-9)  — Standard standalone form controls, drawers, and dialogs (default)
//   - lg: 40px (h-10) — Prominent hero and authentication form selects
// ============================================================================

export type SelectSizeVariant = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
  sizeVariant?: SelectSizeVariant;
  options?: SelectOption[];
  leadingIcon?: React.ReactNode;
  containerClassName?: string;
}

const sizeClasses: Record<SelectSizeVariant, string> = {
  sm: 'h-8 text-xs',
  md: 'h-9 text-xs',
  lg: 'h-10 text-sm',
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      mono = false,
      sizeVariant = 'md',
      options,
      leadingIcon,
      containerClassName = '',
      className = '',
      id,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const hintId = `${selectId}-hint`;
    const errorId = `${selectId}-error`;
    const hasAuxiliaryText = Boolean(label || hint || error);
    const hasCustomWidth = /\bw-[^\s]+/.test(className);

    const horizontalPadding = `${
      leadingIcon ? 'pl-8' : sizeVariant === 'sm' ? 'pl-2.5' : 'pl-3'
    } pr-8`;

    const selectElement = (
      <select
        ref={ref}
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`${hasCustomWidth ? '' : 'w-full'} appearance-none ${sizeClasses[sizeVariant]} ${horizontalPadding} bg-elevated border rounded-sm text-ink transition-colors focus:outline-none focus:bg-surface disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
          mono ? 'font-mono' : 'font-sans'
        } ${
          error
            ? 'border-danger focus:border-danger'
            : 'border-line focus:border-ink'
        } ${className}`.trim()}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
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
          {selectElement}
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink-muted">
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
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
            htmlFor={selectId}
            className="block text-xs font-medium text-ink select-none"
          >
            {label}
          </label>
        )}
        <div className={`relative flex items-center ${hasCustomWidth ? 'w-auto' : 'w-full'}`}>
          {leadingIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-ink-muted">
              {leadingIcon}
            </span>
          )}
          {selectElement}
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink-muted">
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </div>
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

Select.displayName = 'Select';
