// CO-AUTH-FORGOT-FORM — Forgot password split v3.3 — hideLogo rounded-xl
// PA-AUTH-SPLIT — uses AuthCard hideLogo, FORM-SEC-01 generic success no enumeration
'use client';
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AuthCard } from '../ui/AuthCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { validateEmailInput } from '../../services/formSecurity';
import { getAuthApiErrorMessage, postAuthApi } from '../../services/authApi';
import { useI18n } from '../../i18n/I18nContext';

export function ForgotPasswordForm() {
  const { t } = useI18n();
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
      const { response, data } = await postAuthApi('forgotPassword', { email });
      if (!response.ok) {
        setError(getAuthApiErrorMessage(response.status, data, 'No se pudo enviar el enlace. Inténtalo de nuevo.'));
        return;
      }
      setSuccess(true);
    } catch {
      setError('Error interno');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.form.forgot_title')}
      subtitle={t('auth.form.forgot_subtitle')}
      hideLogo
      variant="borderless"
      footer={<div className="text-xs text-ink-secondary"><a href="/login" className="text-accent hover:underline">Volver a iniciar sesión</a></div>}
      trustFooter={
        <div className="flex flex-wrap items-center justify-center gap-3 text-2xs text-ink-muted pt-2">
          <a href="/about" className="hover:text-ink hover:underline">
            About
          </a>
          <span aria-hidden>·</span>
          <a href="/terms" className="hover:text-ink hover:underline">
            TOS
          </a>
          <span aria-hidden>·</span>
          <a href="/privacy" className="hover:text-ink hover:underline">
            Privacy Policy
          </a>
          <span aria-hidden>·</span>
          <a href="/contact" className="hover:text-ink hover:underline">
            Contact
          </a>
        </div>
      }
    >
      {success ? (
        <div className="bg-success-subtle border border-line rounded-sm p-4 text-sm text-success">
          Si el correo existe, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {error && <div role="alert" className="bg-danger-subtle border border-danger/30 rounded-sm p-3 text-xs text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
          <Input
            id="email"
            label="Correo de trabajo"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setFieldError(null); }}
            placeholder="tu@empresa.com"
            hint={fieldError ? undefined : 'Usa tu correo de trabajo'}
            error={fieldError}
            sizeVariant="md"
            autoComplete="email"
            leadingIcon={<span className="text-ink-muted">✉</span>}
          />
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full bg-gradient-to-r from-accent-indigo to-accent-violet hover:opacity-90 text-white border-0 shadow-md">
            Enviar enlace
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
