'use client';

// PA-AUTH — Authentication page archetype implementation
// Canvas #F8F7F4, centered card max-w-md, minimal header, trust footer
// Uses CO-LANGUAGE-SELECTOR per 01_ui_foundation.md + UI-01, no hardcoded ES/EN
import React from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { LanguageSelector } from '../LanguageSelector';

export type AuthPageType = 'login' | 'signup' | 'forgot-password' | 'reset-password';

export interface AuthViewProps {
  initialPage: AuthPageType;
}

export function AuthView({ initialPage }: AuthViewProps) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="w-full px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-sm bg-ink text-surface flex items-center justify-center text-2xs font-bold">O</div>
          <span className="text-sm font-semibold text-ink">OKEng</span>
        </a>
        <LanguageSelector variant="compact" />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        {initialPage === 'login' && <LoginForm />}
        {initialPage === 'signup' && <SignupForm />}
        {initialPage === 'forgot-password' && <ForgotPasswordForm />}
        {initialPage === 'reset-password' && <ResetPasswordForm />}
      </main>
      <footer className="w-full px-6 py-6 text-center text-2xs text-ink-muted">
        © {new Date().getFullYear()} OKEng • <a href="/terms" className="underline hover:text-ink">Términos</a> • <a href="/privacy" className="underline hover:text-ink">Privacidad</a>
      </footer>
    </div>
  );
}
