// PR-CONTACT-FORM — Contact form with FORM-SEC-01, honeypot, char limits, captcha placeholder
// Uses PR-INPUT + PR-TEXTAREA + PR-BUTTON + DS tokens (no hardcoded), a11y, FORM-SEC-01 centralized
import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Input } from './Input';
import { Textarea } from './Input';
import { Button } from './Button';
import { validatePlainText, validateEmailInput, containsUnsafePayload } from '../../services/formSecurity';

export interface ContactFormProps {
  onSubmit?: (data: { name: string; email: string; message: string }) => Promise<void>;
  className?: string;
}

export function ContactForm({ onSubmit, className = '' }: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    if (honeypot) return { spam: true } as const;
    const nextErrors: typeof errors = {};

    const nameCheck = validatePlainText(name, { required: true, minLength: 1, maxLength: 80, fieldLabel: 'Nombre' });
    if (!nameCheck.valid) {
      if (!name.trim() || name.length > 80) nextErrors.name = 'Nombre inválido (1-80)';
      else nextErrors.name = nameCheck.errorMessage || 'Nombre inválido';
    } else if (containsUnsafePayload(name)) {
      nextErrors.name = 'Contenido no permitido detectado';
    }

    const emailCheck = validateEmailInput(email);
    if (!emailCheck.valid) {
      nextErrors.email = emailCheck.errorMessage || 'Email inválido';
    }

    const msgCheck = validatePlainText(message, { required: true, minLength: 10, maxLength: 2000, fieldLabel: 'Mensaje' });
    if (!msgCheck.valid) {
      if (!message.trim() || message.length < 10 || message.length > 2000) nextErrors.message = 'Mensaje 10-2000 caracteres';
      else nextErrors.message = msgCheck.errorMessage || 'Mensaje inválido';
    } else if (containsUnsafePayload(message)) {
      nextErrors.message = 'Contenido no permitido detectado';
    }

    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    if ((validation as { spam?: boolean }).spam) return;
    const fieldErrors = validation as typeof errors;
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (onSubmit) await onSubmit({ name, email, message });
      else await new Promise(r => setTimeout(r, 800));
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setErrors({});
    } catch (err) {
      setError((err as Error).message || 'Error enviando mensaje');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={`rounded-lg border border-line bg-surface p-8 flex flex-col gap-3 shadow-sm ${className}`}>
        <div className="h-10 w-10 rounded-full bg-elevated flex items-center justify-center text-success">✓</div>
        <div className="text-sm font-semibold text-ink">Mensaje enviado</div>
        <div className="text-xs text-ink-secondary">Te responderemos en menos de 24h. Gracias por contactarnos.</div>
        <Button variant="ghost" size="sm" onClick={() => setSuccess(false)} className="self-start mt-2">
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`rounded-lg border border-line bg-surface p-6 md:p-8 flex flex-col gap-4 shadow-sm ${className}`} noValidate>
      <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <Input
        id="contact-name"
        label="Nombre"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Tu nombre"
        error={errors.name || null}
        hint={errors.name ? undefined : 'Tu nombre'}
        sizeVariant="md"
        autoComplete="name"
        required
      />
      <Input
        id="contact-email"
        label="Email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="tu@empresa.com"
        error={errors.email || null}
        hint={errors.email ? undefined : 'Usa tu correo de trabajo'}
        sizeVariant="md"
        autoComplete="email"
        required
      />
      <Textarea
        id="contact-message"
        label="Mensaje"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="¿Cómo podemos ayudarte?"
        error={errors.message || null}
        hint={errors.message ? undefined : `${message.length}/2000`}
        rows={5}
        maxLength={2000}
        required
        className="resize-none"
      />
      {error && <div className="text-xs text-danger bg-danger-subtle border border-line rounded-sm px-3 py-2 flex items-center gap-2" role="alert"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      <div className="text-2xs text-ink-muted">Al enviar aceptas nuestros Términos y Privacidad. Protección anti-spam activa.</div>
      <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="w-full">
        {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
      </Button>
    </form>
  );
}
