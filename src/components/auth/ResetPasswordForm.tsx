// CO-AUTH-RESET-FORM — Reset split v3.3 — hideLogo rounded-xl
// PA-AUTH-SPLIT — uses AuthCard hideLogo, FORM-SEC-01 strength meter
'use client';
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AuthCard } from '../ui/AuthCard';
import { Button } from '../ui/Button';
import { PasswordInput } from '../ui/PasswordInput';
import { validatePasswordInput } from '../../services/formSecurity';
import { useRouter } from '../../app/router';
import { useI18n } from '../../i18n/I18nContext';

export function ResetPasswordForm() {
  const { push } = useRouter();
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    const pwdCheck = validatePasswordInput(newPassword, 'signup');
    if (!pwdCheck.valid) {
      if (!newPassword) errs.newPassword = 'Nueva contraseña requerida';
      else if (newPassword.length < 8) errs.newPassword = 'Mínimo 8 caracteres';
      else errs.newPassword = pwdCheck.errorMessage || 'Contraseña inválida';
    }
    if (newPassword !== confirm) errs.confirm = 'Las contraseñas no coinciden';
    if (!confirm) errs.confirm = errs.confirm || 'Confirma tu contraseña';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (!token) {
        setError('Token faltante o inválido');
        return;
      }
      const csrfRes = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfRes.json();
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ token, newPassword, confirmPassword: confirm }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Token inválido o expirado');
        return;
      }
      setSuccess(true);
      setTimeout(() => push('/login'), 2000);
    } catch {
      setError('Error interno');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.form.reset_title')}
      subtitle={t('auth.form.reset_subtitle')}
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
        <div className="bg-success-subtle border border-line rounded-sm p-4 text-sm text-success">Contraseña restablecida, redirigiendo a login...</div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {error && <div role="alert" className="bg-danger-subtle border border-danger/30 rounded-sm p-3 text-xs text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
          <PasswordInput label="Nueva contraseña" value={newPassword} onChange={setNewPassword} error={errors.newPassword} id="newPassword" showStrength />
          <PasswordInput label="Confirma contraseña" value={confirm} onChange={setConfirm} error={errors.confirm} id="confirm" />
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full bg-gradient-to-r from-accent-indigo to-accent-violet hover:opacity-90 text-white border-0 shadow-md">
            Restablecer contraseña
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
