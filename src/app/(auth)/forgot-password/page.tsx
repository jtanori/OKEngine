'use client';
import React from 'react';
import { AuthView } from '@/components/auth/AuthView';

export default function ForgotPasswordPage() {
  return <AuthView initialPage="forgot-password" />;
}
