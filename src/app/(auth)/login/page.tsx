'use client';
import React from 'react';
import { AuthView } from '../../../components/auth/AuthView';

export default function LoginPage({ authRedirectMessage }: { authRedirectMessage?: string } = {}) {
  return <AuthView initialPage="login" />;
}
