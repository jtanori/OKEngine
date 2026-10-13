'use client';

// PA-AUTH v3.5 — borderless 52/48 (AuthShell) — DS tokens, form-first mobile, 3 layers max
import React from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { AuthShell } from './AuthShell';

export type AuthPageType = 'login' | 'signup' | 'forgot-password' | 'reset-password';

export interface AuthViewProps {
  initialPage: AuthPageType;
  authRedirectMessage?: string;
}

export function AuthView({ initialPage, authRedirectMessage }: AuthViewProps) {
  return (
    <AuthShell variant={initialPage}>
      {initialPage === 'login' && <LoginForm authRedirectMessage={authRedirectMessage} />}
      {initialPage === 'signup' && <SignupForm />}
      {initialPage === 'forgot-password' && <ForgotPasswordForm />}
      {initialPage === 'reset-password' && <ResetPasswordForm />}
    </AuthShell>
  );
}
