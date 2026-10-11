// CO-AUTH-RESET-FORM — Reset password form
import React, { useState } from 'react';
import { AuthCard } from '../ui/AuthCard';
import { PasswordInput } from '../ui/PasswordInput';

export function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!newPassword) errs.newPassword = 'Nueva contraseña requerida';
    else if (newPassword.length < 8) errs.newPassword = 'Mínimo 8 caracteres';
    if (newPassword !== confirm) errs.confirm = 'Las contraseñas no coinciden';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
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
      setTimeout(() => (window.location.href = '/login'), 2000);
    } catch {
      setError('Error interno');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Nueva contraseña"
      subtitle="Elige una contraseña segura"
      footer={<div className="text-xs text-ink-secondary"><a href="/login" className="text-accent hover:underline">Volver a iniciar sesión</a></div>}
    >
      {success ? (
        <div className="bg-success-subtle border border-line rounded-sm p-4 text-sm text-success">Contraseña restablecida, redirigiendo a login...</div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div role="alert" className="bg-danger-subtle border border-line rounded-sm p-3 text-xs text-danger">{error}</div>}
          <PasswordInput label="Nueva contraseña" value={newPassword} onChange={setNewPassword} error={errors.newPassword} id="newPassword" showStrength />
          <PasswordInput label="Confirma contraseña" value={confirm} onChange={setConfirm} error={errors.confirm} id="confirm" />
          <button type="submit" disabled={isLoading} className="w-full h-9 rounded-sm bg-ink text-surface text-sm font-medium hover:bg-ink-strong disabled:opacity-60 flex items-center justify-center gap-2">
            {isLoading && <span className="h-4 w-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin"></span>}
            Restablecer contraseña
          </button>
        </form>
      )}
    </AuthCard>
  );
}
