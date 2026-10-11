'use client';

// ============================================================================
// ARCH-001 & AUTH-04: Authentication Login Route (SURF-AUTH) v3.0
// Route Group: (auth) -> /login
// PA-AUTH archetype, proper Next.js App Router, new AuthView
// ============================================================================

import React from 'react';
import { AuthView } from '@/components/auth/AuthView';
import { useRouter } from '../../router';

export default function LoginPage() {
  const { push, navigateRoute } = useRouter();

  // For now, AuthView handles its own submit via /api/auth/login
  // Preserve router for future workspace navigation if needed
  return <AuthView initialPage="login" />;
}
