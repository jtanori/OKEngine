// CO-AUTH-SIGNUP-FORM — Signup form with name, email, password, terms, FORM-SEC-01
// PA-AUTH — canvas #F8F7F4 centered card max-w-md white surface rounded-lg shadow-md cobalt accent
// Uses PR-AUTH-CARD + PR-INPUT + PR-PASSWORD-INPUT + PR-BUTTON + PR-CHECKBOX + PR-AUTH-DIVIDER + CO-AUTH-SSO-BUTTONS + CO-AUTH-TRUST-FOOTER
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
import { validateEmailInput, validatePasswordInput, validatePlainText, containsUnsafePayload } from '../../services/formSecurity';
import { useRouter } from '../../app/router';

export function SignupForm() {
  const { push } = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; terms?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    const e: typeof errors = {};

    // Name — FORM-SEC-01 via validatePlainText
    const nameCheck = validatePlainText(name, { required: true, minLength: 1, maxLength: 80, fieldLabel: 'Nombre' });
    if (!nameCheck.valid) {
      if (!name.trim()) e.name = 'Nombre requerido';
      else if (containsUnsafePayload(name)) e.name = 'Contenido no permitido';
      else e.name = nameCheck.errorMessage || 'Nombre inválido';
    }

    const emailCheck = validateEmailInput(email);
    if (!emailCheck.valid) {
      if (!email.trim()) e.email = 'Correo requerido';
      else if (containsUnsafePayload(email)) e.email = 'Contenido no permitido';
      else e.email = emailCheck.errorMessage || 'Correo inválido';
    }

    const pwdCheck = validatePasswordInput(password, 'signup');
    if (!pwdCheck.valid) {
      if (!password) e.password = 'Contraseña requerida';
      else if (password.length < 8) e.password = 'Mínimo 8 caracteres';
      else if (containsUnsafePayload(password)) e.password = 'Contenido no permitido';
      else e.password = pwdCheck.errorMessage || 'Contraseña inválida';
    }

    if (!terms) e.terms = 'Debes aceptar términos';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const csrfRes = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfRes.json();
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ name, email, password, terms: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) setError(`Demasiados intentos, intenta en ${data.retryAfter || 60}s`);
        else if (res.status === 409) setError('El correo ya existe');
        else setError(data.message || 'Error al crear cuenta');
        return;
      }
      push('/workspaces/okeng/collections');
    } catch {
      setError('Error interno');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Empieza gratis con 1.000 consultas/mes. Sin tarjeta."
      footer={<div className="text-xs text-ink-secondary">¿Ya tienes cuenta? <a href="/login" className="text-accent hover:underline">Inicia sesión</a></div>}
      trustFooter={<AuthTrustFooter />}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <div role="alert" className="bg-danger-subtle border border-line rounded-sm p-3 text-xs text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        <Input
          id="name"
          label="Nombre"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ada Lovelace"
          hint={errors.name ? undefined : 'Tu nombre'}
          error={errors.name || null}
          sizeVariant="md"
          autoComplete="name"
        />
        <Input
          id="email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
          hint={errors.email ? undefined : 'Usa tu correo de trabajo'}
          error={errors.email || null}
          sizeVariant="md"
          autoComplete="email"
        />
        <PasswordInput label="Contraseña" value={password} onChange={setPassword} error={errors.password} id="password" showStrength hint="Mínimo 8 caracteres" />
        <Checkbox
          id="terms"
          checked={terms}
          onChange={setTerms}
          error={errors.terms || null}
          required
          label={
            <span>
              Acepto los <a href="/terms" className="underline hover:text-ink">Términos</a> y <a href="/privacy" className="underline hover:text-ink">Privacidad</a>
            </span>
          }
        />
        <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full">
          Crear cuenta
        </Button>
        <AuthDivider label="o" />
        <SsoButtons />
      </form>
    </AuthCard>
  );
}
