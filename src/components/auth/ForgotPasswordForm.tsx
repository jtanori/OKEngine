// CO-AUTH-FORGOT-FORM — Forgot password form
// PA-AUTH — canvas #F8F7F4 centered card max-w-md white surface rounded-lg shadow-md
// Uses PR-AUTH-CARD + PR-INPUT + PR-BUTTON, FORM-SEC-01, no enumeration, generic success
'use client';
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AuthCard } from '../ui/AuthCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { validateEmailInput } from '../../services/formSecurity';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateEmailInput(email);
    if (!check.valid) {
      setFieldError(check.errorMessage || 'Correo inválido');
      return;
    }
    setFieldError(null);
    setIsLoading(true);
    setError(null);
    try {
      const csrfRes = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfRes.json();
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ email }),
      });
      // Always success generic, no enumeration — per SEC-01 / WF-AUTH-FORGOT-01
      setSuccess(true);
    } catch {
      setError('Error interno');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Restablece tu contraseña"
      subtitle="Te enviaremos un enlace para restablecerla"
      footer={<div className="text-xs text-ink-secondary"><a href="/login" className="text-accent hover:underline">Volver a iniciar sesión</a></div>}
    >
      {success ? (
        <div className="bg-success-subtle border border-line rounded-sm p-4 text-sm text-success">
          Si el correo existe, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {error && <div role="alert" className="bg-danger-subtle border border-line rounded-sm p-3 text-xs text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
          <Input
            id="email"
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setFieldError(null); }}
            placeholder="tu@empresa.com"
            hint={fieldError ? undefined : 'Usa tu correo de trabajo'}
            error={fieldError}
            sizeVariant="md"
            autoComplete="email"
          />
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full">
            Enviar enlace
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
