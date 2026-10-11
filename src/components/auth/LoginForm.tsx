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
    </AuthCard>
  );
}
