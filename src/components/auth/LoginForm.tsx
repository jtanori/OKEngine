// CO-AUTH-LOGIN-FORM — Login form v3.3 split: SSO top → Divider o → Input/Password → Gradient CTA → Footer border-t
// PA-AUTH-SPLIT 55/45 — reorders per locked liked v2, FORM-SEC-01, hideLogo, gradient from-[#6366F1] to-[#8B5CF6], collapsed DEV LOGIN
'use client';
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AuthCard } from '../ui/AuthCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { PasswordInput } from '../ui/PasswordInput';
import { SsoButtons } from './SsoButtons';
import { validateEmailInput, validatePasswordInput, containsUnsafePayload } from '../../services/formSecurity';
import { authService } from '../../services/auth';
import { getAuthApiErrorMessage, navigateToAuthPath, postAuthApi } from '../../services/authApi';
import { useLocationSearch } from '../../services/useLocationSearch';
import { useI18n } from '../../i18n/I18nContext';

export interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void>;
  authRedirectMessage?: string;
}

export function LoginForm({ onSubmit, authRedirectMessage }: LoginFormProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [oauthTermsAccepted, setOAuthTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const search = useLocationSearch();
  const searchParams = new URLSearchParams(search);
  const authError = searchParams.get('authError');
  const routeError = authError === 'callback'
    ? 'No se pudo verificar el enlace. Solicita uno nuevo o inicia sesión.'
    : authError === 'workspace'
      ? 'Tu cuenta se verificó, pero no se pudo cargar el espacio de trabajo. Inténtalo de nuevo.'
      : null;
  const notice = authRedirectMessage
    || (searchParams.get('confirmed') === '1' ? 'Correo confirmado. Ya puedes iniciar sesión.' : null)
    || (searchParams.get('passwordReset') === '1' ? 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' : null);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    const emailCheck = validateEmailInput(email);
    if (!emailCheck.valid) {
      errors.email = emailCheck.errorMessage || 'Correo inválido';
    } else if (containsUnsafePayload(email)) {
      errors.email = 'Contenido no permitido';
    }
    const pwdCheck = validatePasswordInput(password, 'login');
    if (!pwdCheck.valid) {
      if (!password) errors.password = 'Contraseña requerida';
      else if (containsUnsafePayload(password)) errors.password = 'Contenido no permitido';
      else errors.password = pwdCheck.errorMessage || 'Contraseña inválida';
    }
    return errors;
  };

  const handleDevLogin = async (userId: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Dev login falló');
        setIsLoading(false);
        return;
      }
      try {
        authService.switchPersona(userId);
      } catch {}
      navigateToAuthPath('/workspaces/okeng/collections', '/workspaces/okeng/collections');
      return;
    } catch {
      setError('Error en dev login');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      if (onSubmit) await onSubmit(email, password);
      else {
        const { response, data } = await postAuthApi('login', { email, password, remember });
        if (!response.ok) {
          setError(getAuthApiErrorMessage(response.status, data, 'Credenciales inválidas'));
          return;
        }
        navigateToAuthPath(data.redirectTo, '/workspaces/okeng/collections');
      }
    } catch {
      setError('Error interno, intenta de nuevo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.form.login_title')}
      subtitle={t('auth.form.login_subtitle')}
      hideLogo
      variant="borderless"
      footer={
        <div className="text-xs text-ink-secondary">
          ¿No tienes cuenta? <a href="/signup" className="text-accent hover:underline font-medium">Regístrate</a>
        </div>
      }
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
      {/* Remember me applies to both email/password and provider sign-in. */}
      <div className="mb-3">
        <Checkbox id="remember" checked={remember} onChange={setRemember} label="Recordarme" />
      </div>
      <SsoButtons
        remember={remember}
        termsAccepted={oauthTermsAccepted}
        onTermsAcceptedChange={setOAuthTermsAccepted}
        showTermsConsent
      />

      {notice && <div role="status" className="bg-success-subtle border border-line rounded-sm p-3 text-xs text-success">{notice}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {(error || routeError) && (
          <div role="alert" className="bg-danger-subtle border border-danger/30 rounded-sm p-3 text-xs text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error || routeError}</span>
          </div>
        )}
        <Input
          id="email"
          label="Correo de trabajo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
          hint={fieldErrors.email ? undefined : 'Usa tu correo de trabajo'}
          error={fieldErrors.email || null}
          sizeVariant="md"
          autoComplete="email"
          leadingIcon={<span className="text-ink-muted">✉</span>}
        />
        <PasswordInput label="Contraseña" value={password} onChange={setPassword} error={fieldErrors.password} id="password" hint={fieldErrors.password ? undefined : 'Tu contraseña'} />
        <div className="flex justify-end -mt-1">
          <a href="/forgot-password" className="text-xs text-accent hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          className="w-full bg-gradient-to-r from-accent-indigo to-accent-violet hover:opacity-90 text-white border-0 shadow-md justify-center gap-1.5"
        >
          Iniciar sesión <span aria-hidden>→</span>
        </Button>
      </form>

      {/* DEV LOGIN — hidden per defect #3, keep DOM for future arena use */}
      <details hidden open={devOpen} onToggle={(e) => setDevOpen((e.target as HTMLDetailsElement).open)} className="rounded-md border border-dashed border-line bg-elevated/60 open:p-4 p-0 overflow-hidden">
        <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-3 open:px-0 open:py-0 open:mb-3">
          <span className="text-2xs font-semibold tracking-widest uppercase text-ink-muted">Dev login — sin DB / sin contraseña</span>
          <span className="text-2xs bg-warning-subtle text-warning border border-warning/30 px-1.5 py-0.5 rounded-xs font-mono">arena</span>
        </summary>
        <div className="flex flex-col gap-3">
          <p className="text-2xs text-ink-secondary leading-relaxed">
            En este sandbox <code className="bg-surface border border-line rounded-xs px-1">DATABASE_URL=dummy</code>, el login normal falla. Usa un usuario mock.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Button type="button" variant="primary" size="md" onClick={() => handleDevLogin('usr_sarah_102')} disabled={isLoading} className="w-full">
              Entrar como Sarah Chen — Owner (todos los permisos)
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" size="md" onClick={() => handleDevLogin('usr_marcus_204')} disabled={isLoading} className="w-full">
                Marcus — Write
              </Button>
              <Button type="button" variant="secondary" size="md" onClick={() => handleDevLogin('usr_elena_309')} disabled={isLoading} className="w-full">
                Elena — Read
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-2xs text-ink-muted font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-success"></span> sets <code>okeng.sid</code> cookie + <code>localStorage</code> → <code>/workspaces/okeng/collections</code>
          </div>
        </div>
      </details>
    </AuthCard>
  );
}
