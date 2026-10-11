// CO-AUTH-FORGOT-FORM — Forgot password form
import React, { useState } from 'react';
import { AuthCard } from '../ui/AuthCard';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Correo inválido');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const csrfRes = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfRes.json();
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ email }),
      });
      // Always success generic, no enumeration
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div role="alert" className="bg-danger-subtle border border-line rounded-sm p-3 text-xs text-danger">{error}</div>}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-ink">Correo electrónico</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" className="w-full h-9 px-3 rounded-sm border border-line bg-surface text-sm" />
            <div className="text-xs text-ink-muted">Usa tu correo de trabajo</div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full h-9 rounded-sm bg-ink text-surface text-sm font-medium hover:bg-ink-strong disabled:opacity-60 flex items-center justify-center gap-2">
            {isLoading && <span className="h-4 w-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin"></span>}
            Enviar enlace
          </button>
        </form>
      )}
    </AuthCard>
  );
}
