'use client';

import React, { useEffect, useState } from 'react';
import { Github } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { AuthDivider } from '../ui/AuthDivider';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import {
  getAuthProviders,
  getSafeOAuthAuthorizationUrl,
  startOAuth,
  type AuthOAuthProvider,
} from '../../services/authApi';

export interface SsoButtonsProps {
  remember?: boolean;
  termsAccepted: boolean;
  onTermsAcceptedChange?: (accepted: boolean) => void;
  showTermsConsent?: boolean;
}

export function SsoButtons({
  remember = false,
  termsAccepted,
  onTermsAcceptedChange,
  showTermsConsent = false,
}: SsoButtonsProps) {
  const { t } = useI18n();
  const [providers, setProviders] = useState<AuthOAuthProvider[] | null>(null);
  const [startingProvider, setStartingProvider] = useState<AuthOAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAuthProviders()
      .then((configuredProviders) => {
        if (active) setProviders(configuredProviders);
      })
      .catch(() => {
        if (active) setProviders([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!providers || providers.length === 0) return null;

  const handleStart = async (provider: AuthOAuthProvider) => {
    if (!termsAccepted || startingProvider) return;
    setStartingProvider(provider);
    setError(null);
    try {
      const { response, data } = await startOAuth(provider, { remember, termsAccepted });
      if (!response.ok) {
        setError(t('auth.oauth.start_error'));
        return;
      }
      const authorizationUrl = getSafeOAuthAuthorizationUrl(data.url, provider);
      if (!authorizationUrl) {
        setError(t('auth.oauth.start_error'));
        return;
      }
      window.location.assign(authorizationUrl);
    } catch {
      setError(t('auth.oauth.start_error'));
    } finally {
      setStartingProvider(null);
    }
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={Boolean(startingProvider)}>
      {showTermsConsent && onTermsAcceptedChange && (
        <Checkbox
          id="oauth-terms-consent"
          checked={termsAccepted}
          onChange={onTermsAcceptedChange}
          required
          label={(
            <span>
              {t('auth.oauth.terms_consent')}{' '}
              <a href="/terms" className="underline hover:text-ink">{t('auth.oauth.terms_link')}</a>{' '}
              {t('auth.oauth.and')}{' '}
              <a href="/privacy" className="underline hover:text-ink">{t('auth.oauth.privacy_link')}</a>.
            </span>
          )}
        />
      )}
      <div className="flex flex-col gap-3">
        {providers.map((provider) => (
          <Button
            key={provider}
            type="button"
            variant="secondary"
            size="md"
            disabled={!termsAccepted || Boolean(startingProvider)}
            isLoading={startingProvider === provider}
            onClick={() => void handleStart(provider)}
            className="w-full bg-surface border-line rounded-lg shadow-sm justify-center gap-2"
            aria-label={provider === 'google' ? t('auth.oauth.continue_google') : t('auth.oauth.continue_github')}
          >
            {provider === 'google'
              ? <span aria-hidden className="w-4 h-4 rounded-full border border-line flex items-center justify-center text-2xs font-bold text-accent">G</span>
              : <Github aria-hidden className="w-4 h-4" />}
            <span>{provider === 'google' ? t('auth.oauth.continue_google') : t('auth.oauth.continue_github')}</span>
          </Button>
        ))}
      </div>
      {error && (
        <div role="alert" className="bg-danger-subtle border border-danger/30 rounded-sm p-3 text-xs text-danger">
          {error}
        </div>
      )}
      <AuthDivider label={t('auth.oauth.or_email')} />
    </div>
  );
}
