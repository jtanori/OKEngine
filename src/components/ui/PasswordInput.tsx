// PR-PASSWORD-INPUT — Input with show/hide toggle, strength meter optional
// DS tokens: border-line, rounded-sm, text-ink, bg-surface
import React, { useState } from 'react';

export interface PasswordInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  id?: string;
  showStrength?: boolean;
  className?: string;
}

export function PasswordInput({ label, placeholder = '••••••••', value, onChange, error, hint, id, showStrength = false, className = '' }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  const getStrength = (pwd: string) => {
    if (!pwd) return { label: '', color: '' };
    if (pwd.length < 8) return { label: 'Débil', color: 'bg-danger' };
    if (pwd.length < 12) return { label: 'Media', color: 'bg-warning' };
    return { label: 'Fuerte', color: 'bg-success' };
  };

  const strength = showStrength ? getStrength(value) : null;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label htmlFor={id} className="text-xs font-medium text-ink">{label}</label>}
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          className={`w-full h-9 px-3 pr-10 rounded-sm border bg-surface text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-subtle focus:border-accent ${
            error ? 'border-danger' : 'border-line'
          }`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-xs px-1"
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {strength && value && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
            <div className={`h-full ${strength.color} transition-all`} style={{ width: value.length < 8 ? '33%' : value.length < 12 ? '66%' : '100%' }}></div>
          </div>
          <span className="text-2xs text-ink-muted">{strength.label}</span>
        </div>
      )}
      {(hint || error) && (
        <div id={`${id}-hint`} className={`text-xs ${error ? 'text-danger' : 'text-ink-muted'}`} role={error ? 'alert' : undefined}>
          {error || hint}
        </div>
      )}
    </div>
  );
}
