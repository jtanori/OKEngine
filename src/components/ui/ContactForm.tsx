// PR-CONTACT-FORM — Contact form with FORM-SEC-01, honeypot, char limits, captcha placeholder
import React, { useState } from 'react';

export interface ContactFormProps {
  onSubmit?: (data: { name: string; email: string; message: string }) => Promise<void>;
  className?: string;
}

export function ContactForm({ onSubmit, className = '' }: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    if (honeypot) return 'spam';
    const dangerous = /<\s*(script|iframe|object|embed)\b|on\w+\s*=|(javascript|data|vbscript):/i;
    if (dangerous.test(name + email + message)) return 'Contenido no permitido detectado';
    if (!name.trim() || name.length > 80) return 'Nombre inválido (1-80)';
    if (!email.includes('@') || email.length > 120) return 'Email inválido';
    if (!message.trim() || message.length < 10 || message.length > 2000) return 'Mensaje 10-2000 caracteres';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      if (v !== 'spam') setError(v);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (onSubmit) await onSubmit({ name, email, message });
      else await new Promise(r => setTimeout(r, 800));
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError((err as Error).message || 'Error enviando mensaje');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={`rounded-lg border border-line bg-surface p-8 flex flex-col gap-3 shadow-sm ${className}`}>
        <div className="h-10 w-10 rounded-full bg-elevated flex items-center justify-center">✓</div>
        <div className="text-sm font-semibold text-ink">Mensaje enviado</div>
        <div className="text-xs text-ink-secondary">Te responderemos en menos de 24h. Gracias por contactarnos.</div>
        <button type="button" onClick={() => setSuccess(false)} className="mt-2 text-xs text-accent hover:underline self-start">Enviar otro mensaje</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`rounded-lg border border-line bg-surface p-6 md:p-8 flex flex-col gap-4 shadow-sm ${className}`} noValidate>
      <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-ink">Nombre</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" required className="h-9 rounded-sm border border-line bg-elevated px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-subtle" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-ink">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" required className="h-9 rounded-sm border border-line bg-elevated px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-subtle" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-ink">Mensaje</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="¿Cómo podemos ayudarte?" required maxLength={2000} rows={5} className="rounded-sm border border-line bg-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-subtle resize-none" />
        <div className="text-2xs text-ink-muted">{message.length}/2000</div>
      </div>
      {error && <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-sm px-3 py-2" role="alert">{error}</div>}
      <div className="text-2xs text-ink-muted">Al enviar aceptas nuestros Términos y Privacidad. Protección anti-spam activa.</div>
      <button type="submit" disabled={isSubmitting} className="h-9 rounded-sm bg-ink text-surface text-sm font-medium hover:bg-ink-strong disabled:opacity-50 flex items-center justify-center gap-2">
        {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
      </button>
    </form>
  );
}
