'use client';

// PA-AUTH-SPLIT — v3.3 locked liked v2 — shared header + 55/45 split
import React from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { AuthSplitLayout } from './AuthSplitLayout';

export type AuthPageType = 'login' | 'signup' | 'forgot-password' | 'reset-password';

export interface AuthViewProps {
  initialPage: AuthPageType;
}

export function AuthView({ initialPage }: AuthViewProps) {
  return (
    <AuthSplitLayout>
      {initialPage === 'login' && <LoginForm />}
      {initialPage === 'signup' && <SignupForm />}
      {initialPage === 'forgot-password' && <ForgotPasswordForm />}
      {initialPage === 'reset-password' && <ResetPasswordForm />}
    </AuthSplitLayout>
  );
}
