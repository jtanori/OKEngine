// CO-AUTH-SIGNUP-FORM — Signup split v3.3: SSO top → Divider o → Name/Email/Password/terms → Gradient CTA
// PA-AUTH-SPLIT 55/45 — hideLogo, FORM-SEC-01, showStrength
'use client';
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AuthCard } from '../ui/AuthCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { PasswordInput } from '../ui/PasswordInput';
import { SsoButtons } from './SsoButtons';
import { validateEmailInput, validatePasswordInput, validatePlainText, containsUnsafePayload } from '../../services/formSecurity';
import { getAuthApiErrorMessage, navigateToAuthPath, postAuthApi } from '../../services/authApi';
import { useI18n } from '../../i18n/I18nContext';

export function SignupForm() {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; terms?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
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
      const { response, data } = await postAuthApi('signup', { name, email, password, terms: true });
      if (!response.ok) {
        if (response.status === 409) setError('El correo ya existe');
        else setError(getAuthApiErrorMessage(response.status, data, 'Error al crear cuenta'));
        return;
      }
      if (data.confirmationRequired === true) {
        setConfirmationRequired(true);
        return;
      }
      navigateToAuthPath(data.redirectTo, '/workspaces/okeng/collections');
    } catch {
      setError('Error interno');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.form.signup_title')}
      subtitle={t('auth.form.signup_subtitle')}
      hideLogo
      variant="borderless"
      footer={<div className="text-xs text-ink-secondary">¿Ya tienes cuenta? <a href="/login" className="text-accent hover:underline">Inicia sesión</a></div>}
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
      {!confirmationRequired && (
        <Checkbox
          id="terms"
          checked={terms}
          onChange={setTerms}
          error={errors.terms || null}
          required
          label={(
            <span>
              Acepto los <a href="/terms" className="underline hover:text-ink">Términos</a> y <a href="/privacy" className="underline hover:text-ink">Privacidad</a>
            </span>
          )}
        />
      )}
      <SsoButtons termsAccepted={terms} />
      {confirmationRequired ? (
        <div role="status" className="bg-success-subtle border border-line rounded-sm p-4 text-sm text-success">
          Revisa tu correo y confirma tu cuenta para continuar. Si no ves el mensaje, revisa también la carpeta de spam.
          <div className="mt-3"><a href="/login" className="text-accent hover:underline">Volver a iniciar sesión</a></div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <div role="alert" className="bg-danger-subtle border border-danger/30 rounded-sm p-3 text-xs text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
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
          label="Correo de trabajo"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
          hint={errors.email ? undefined : 'Usa tu correo de trabajo'}
          error={errors.email || null}
          sizeVariant="md"
          autoComplete="email"
          leadingIcon={<span className="text-ink-muted">✉</span>}
        />
        <PasswordInput label="Contraseña" value={password} onChange={setPassword} error={errors.password} id="password" showStrength hint="Mínimo 8 caracteres" />
        <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full bg-gradient-to-r from-accent-indigo to-accent-violet hover:opacity-90 text-white border-0 shadow-md justify-center gap-1.5">
          Crear cuenta <span aria-hidden>→</span>
        </Button>
      </form>
      )}
    </AuthCard>
  );
}
