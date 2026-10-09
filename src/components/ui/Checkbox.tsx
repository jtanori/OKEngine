import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

// ============================================================================
// UI-01 & 01_ui_foundation.md: Accessible Checkbox Primitive (PR-CHECKBOX)
// Consumes DS-* tokens: border-line, bg-elevated, bg-ink, text-surface, rounded-xs
// ============================================================================

export interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  description?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  hint,
  description,
  error,
  required = false,
  disabled = false,
  className = '',
}) => {
  const resolvedHint = hint ?? description;
  const hintId = id && resolvedHint ? `${id}-hint` : undefined;
  const errorId = id && error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1.5 text-left ${className}`.trim()}>
      <div className="flex items-start gap-2.5">
        <button
          id={id}
          type="button"
          role="checkbox"
          disabled={disabled}
          aria-checked={checked}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onClick={() => !disabled && onChange(!checked)}
          className={`mt-0.5 w-4 h-4 shrink-0 rounded-xs border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            checked
              ? 'bg-ink border-ink text-surface'
              : error
              ? 'bg-elevated border-danger'
              : 'bg-elevated border-line hover:border-ink'
          }`}
        >
          {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
        </button>

        <div className="space-y-0.5">
          <div className="text-xs text-ink-secondary leading-relaxed select-none">
            {label}
            {required && (
              <span className="text-danger ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </div>
          {resolvedHint && !error && (
            <p id={hintId} className="text-2xs text-ink-secondary leading-relaxed">
              {resolvedHint}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-2xs font-mono text-danger pl-6 flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
