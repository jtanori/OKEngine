// CO-AUTH-LOGIN-FORM — Login form with FORM-SEC-01, empty initial values, placeholder+hint, field errors, isLoading
import React, { useState } from 'react';
import { AuthCard } from '../ui/AuthCard';
import { PasswordInput } from '../ui/PasswordInput';
import { AuthDivider } from '../ui/AuthDivider';
import { AuthTrustFooter } from './AuthTrustFooter';
import { SsoButtons } from './SsoButtons';

export interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    // FORM-SEC-01 check
    const dangerous = /<\s*(script|iframe|object|embed)\b|on\w+\s*=|(javascript|data|vbscript):/i;
    if (!email) errors.email = 'Correo requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Correo inválido';
    else if (dangerous.test(email)) errors.email = 'Contenido no permitido';
    if (!password) errors.password = 'Contraseña requerida';
    else if (dangerous.test(password)) errors.password = 'Contenido no permitido';
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      if (onSubmit) await onSubmit(email, password);
      else {
        // Default: POST to /api/auth/login with CSRF
        const csrfRes = await fetch('/api/csrf-token');
        const { csrfToken } = await csrfRes.json();
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 429) setError(`Demasiados intentos, intenta en ${data.retryAfter || 60}s`);
          else setError('Credenciales inválidas');
          return;
        }
        window.location.href = '/workspaces';
      }
    } catch (err) {
      setError('Error interno, intenta de nuevo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Inicia sesión en OKEng"
      subtitle="Tu documentación, respondiendo dentro de tu app"
      footer={
        <div className="text-xs text-ink-secondary">
          ¿No tienes cuenta? <a href="/signup" className="text-accent hover:underline">Regístrate</a>
        </div>
      }
      trustFooter={<AuthTrustFooter />}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="bg-danger-subtle border border-line rounded-sm p-3 text-xs text-danger flex items-center gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium text-ink">Correo electrónico</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@empresa.com"
            aria-invalid={!!fieldErrors.email}
            aria-describedby="email-hint"
            className={`w-full h-9 px-3 rounded-sm border bg-surface text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-subtle focus:border-accent ${fieldErrors.email ? 'border-danger' : 'border-line'}`}
          />
          <div id="email-hint" className={`text-xs ${fieldErrors.email ? 'text-danger' : 'text-ink-muted'}`} role={fieldErrors.email ? 'alert' : undefined}>
            {fieldErrors.email || 'Usa tu correo de trabajo'}
          </div>
        </div>
        <PasswordInput label="Contraseña" value={password} onChange={setPassword} error={fieldErrors.password} id="password" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            <input type="checkbox" className="rounded-xs border-line" /> Recordarme
          </label>
          <a href="/forgot-password" className="text-xs text-accent hover:underline">¿Olvidaste tu contraseña?</a>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-9 rounded-sm bg-ink text-surface text-sm font-medium hover:bg-ink-strong disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading && <span className="h-4 w-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin"></span>}
          Iniciar sesión
        </button>
        <AuthDivider label="o" />
        <SsoButtons />
      </form>
    </AuthCard>
  );
}
