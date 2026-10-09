// ============================================================================
// ARCH-001 §5.1 & ARCH-MIG-001: Canonical App Router Root Layout
// Provides global I18nProvider, AppRouterProvider, and Design System root tokens
// ============================================================================

import React from 'react';
import { I18nProvider } from '../i18n/I18nContext';
import { AppRouterProvider } from './router';
import '../index.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppRouterProvider>
        <div className="min-h-screen bg-canvas text-ink font-sans antialiased">
          {children}
        </div>
      </AppRouterProvider>
    </I18nProvider>
  );
}
