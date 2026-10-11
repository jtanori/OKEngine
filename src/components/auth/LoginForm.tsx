// CO-AUTH-LOGIN-FORM — Login form with FORM-SEC-01, empty initial values, placeholder+hint, field errors, isLoading
// PA-AUTH — canvas #F8F7F4 centered card max-w-md white surface cobalt accent rounded-lg shadow-md
// Uses PR-AUTH-CARD + PR-INPUT + PR-PASSWORD-INPUT + PR-BUTTON + PR-CHECKBOX + PR-AUTH-DIVIDER + CO-AUTH-SSO-BUTTONS + CO-AUTH-TRUST-FOOTER
// DS tokens only, no hardcoded colors, a11y AlertCircle role=alert aria-invalid, 5-Link Auth Chain, TIER_AUTH_5_PER_15M
'use client';
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AuthCard } from '../ui/AuthCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { PasswordInput } from '../ui/PasswordInput';
import { AuthDivider } from '../ui/AuthDivider';
import { AuthTrustFooter } from './AuthTrustFooter';
import { SsoButtons } from './SsoButtons';
import { validateEmailInput, validatePasswordInput, containsUnsafePayload } from '../../services/formSecurity';
import { useRouter } from '../../app/router';
import { authService } from '../../services/auth';

export interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const { push } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};

    // FORM-SEC-01 via centralized helpers
    const emailCheck = validateEmailInput(email);
    if (!emailCheck.valid) {
      errors.email = emailCheck.errorMessage || 'Correo inválido';
    } else if (containsUnsafePayload(email)) {
      errors.email = 'Contenido no permitido';
    }

    const pwdCheck = validatePasswordInput(password, 'login');
    if (!pwdCheck.valid) {
      // Map to ES messages expected in spec
      if (!password) errors.password = 'Contraseña requerida';
      else if (containsUnsafePayload(password)) errors.password = 'Contenido no permitido';
      else errors.password = pwdCheck.errorMessage || 'Contraseña inválida';
    }

    return errors;
  };

  const handleDevLogin = async (userId: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Dev login falló');
        setIsLoading(false);
        return;
      }
      // Sync client AuthService (localStorage + in-memory) and force hard navigation
      // so AppShell re-reads persona and server cookie is sent on next request.
      try {
        authService.switchPersona(userId);
      } catch {}
      // Hard reload ensures AppShell picks up new currentUserId and okeng.sid cookie
      window.location.href = '/workspaces/okeng/collections';
      return;
    } catch {
      setError('Error en dev login');
      setIsLoading(false);
    }
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
        push('/workspaces/okeng/collections');
      }
    } catch {
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && (
          <div role="alert" className="bg-danger-subtle border border-line rounded-sm p-3 text-xs text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <Input
          id="email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
          hint={fieldErrors.email ? undefined : 'Usa tu correo de trabajo'}
          error={fieldErrors.email || null}
          sizeVariant="md"
          autoComplete="email"
        />
        <PasswordInput label="Contraseña" value={password} onChange={setPassword} error={fieldErrors.password} id="password" />
        <div className="flex items-center justify-between">
          <Checkbox
            id="remember"
            checked={remember}
            onChange={setRemember}
            label="Recordarme"
          />
          <a href="/forgot-password" className="text-xs text-accent hover:underline">¿Olvidaste tu contraseña?</a>
        </div>
        <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full">
          Iniciar sesión
        </Button>
        <AuthDivider label="o" />
        <SsoButtons />
      </form>

      {/* Dev bypass — arena branch only, no DB needed */}
      <div className="rounded-md border border-dashed border-line bg-elevated/60 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold tracking-widest uppercase text-ink-muted">Dev login — sin DB / sin contraseña</span>
          <span className="text-2xs bg-warning-subtle text-warning border border-warning/30 px-1.5 py-0.5 rounded-xs font-mono">arena</span>
        </div>
        <p className="text-2xs text-ink-secondary leading-relaxed">
          En este sandbox <code className="bg-surface border border-line rounded-xs px-1">DATABASE_URL=dummy</code>, el login normal falla. Usa un usuario mock para entrar al dashboard y probar el AppShell, colecciones y embeds.
        </p>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => handleDevLogin('usr_sarah_102')}
            disabled={isLoading}
            className="w-full h-9 inline-flex items-center justify-center rounded-sm bg-ink text-surface border border-ink hover:bg-ink-strong text-xs font-medium transition-colors disabled:opacity-50"
          >
            Entrar como Sarah Chen — Owner (todos los permisos)
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDevLogin('usr_marcus_204')}
              disabled={isLoading}
              className="h-9 inline-flex items-center justify-center rounded-sm bg-surface text-ink border border-line hover:bg-elevated text-xs font-medium transition-colors disabled:opacity-50"
            >
              Marcus — Write
            </button>
            <button
              type="button"
              onClick={() => handleDevLogin('usr_elena_309')}
              disabled={isLoading}
              className="h-9 inline-flex items-center justify-center rounded-sm bg-surface text-ink border border-line hover:bg-elevated text-xs font-medium transition-colors disabled:opacity-50"
            >
              Elena — Read
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-2xs text-ink-muted font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-success"></span> sets <code>okeng.sid</code> cookie + <code>localStorage</code> → <code>/workspaces/okeng/collections</code>
        </div>
      </div>
    </AuthCard>
  );
}
