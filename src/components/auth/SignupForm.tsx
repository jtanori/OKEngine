// CO-AUTH-SIGNUP-FORM — Signup form with name, email, password, terms, FORM-SEC-01
import React, { useState } from 'react';
import { AuthCard } from '../ui/AuthCard';
import { PasswordInput } from '../ui/PasswordInput';
import { AuthDivider } from '../ui/AuthDivider';
import { AuthTrustFooter } from './AuthTrustFooter';
import { SsoButtons } from './SsoButtons';

export function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; terms?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    const e: typeof errors = {};
    const dangerous = /<\s*(script|iframe|object|embed)\b|on\w+\s*=|(javascript|data|vbscript):/i;
    if (!name) e.name = 'Nombre requerido';
    else if (dangerous.test(name)) e.name = 'Contenido no permitido';
    if (!email) e.email = 'Correo requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Correo inválido';
    else if (dangerous.test(email)) e.email = 'Contenido no permitido';
    if (!password) e.password = 'Contraseña requerida';
    else if (password.length < 8) e.password = 'Mínimo 8 caracteres';
    else if (dangerous.test(password)) e.password = 'Contenido no permitido';
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
        else setError('Error al crear cuenta');
        return;
      }
      window.location.href = '/workspaces';
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div role="alert" className="bg-danger-subtle border border-line rounded-sm p-3 text-xs text-danger">{error}</div>}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-xs font-medium text-ink">Nombre</label>
          <input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ada Lovelace" aria-invalid={!!errors.name} className={`w-full h-9 px-3 rounded-sm border bg-surface text-sm ${errors.name ? 'border-danger' : 'border-line'}`} />
          {errors.name ? <div className="text-xs text-danger" role="alert">{errors.name}</div> : <div className="text-xs text-ink-muted">Tu nombre</div>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium text-ink">Correo electrónico</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" aria-invalid={!!errors.email} className={`w-full h-9 px-3 rounded-sm border bg-surface text-sm ${errors.email ? 'border-danger' : 'border-line'}`} />
          {errors.email ? <div className="text-xs text-danger" role="alert">{errors.email}</div> : <div className="text-xs text-ink-muted">Usa tu correo de trabajo</div>}
        </div>
        <PasswordInput label="Contraseña" value={password} onChange={setPassword} error={errors.password} id="password" showStrength hint="Mínimo 8 caracteres" />
        <label className="flex items-start gap-2 text-xs text-ink-secondary">
          <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} className="mt-0.5 rounded-xs border-line" />
          <span>Acepto los <a href="/terms" className="underline hover:text-ink">Términos</a> y <a href="/privacy" className="underline hover:text-ink">Privacidad</a></span>
        </label>
        {errors.terms && <div className="text-xs text-danger" role="alert">{errors.terms}</div>}
        <button type="submit" disabled={isLoading} className="w-full h-9 rounded-sm bg-ink text-surface text-sm font-medium hover:bg-ink-strong disabled:opacity-60 flex items-center justify-center gap-2">
          {isLoading && <span className="h-4 w-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin"></span>}
          Crear cuenta
        </button>
        <AuthDivider label="o" />
        <SsoButtons />
      </form>
    </AuthCard>
  );
}
