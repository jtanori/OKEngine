// ============================================================================
// ARCH-001 §5.1 & ARCH-MIG-001: Canonical App Router Root Layout
// Provides global I18nProvider, AppRouterProvider, and Design System root tokens
//
// NEXT_ROOT_TAGS: The App Router root layout MUST render the <html> and <body>
// elements. Omitting them triggers NEXT_MISSING_ROOT_TAGS
// ("Missing <html> and <body> tags in the root layout.") and Next.js discards
// the rendered tree in favour of an <html id="__next_error__"> error document.
// The document-level metadata that used to live in the legacy Vite-era
// index.html (which the App Router ignores) now lives here as the `metadata`
// and `viewport` exports so it is actually emitted on every route.
// ============================================================================

import React from 'react';
import type { Metadata, Viewport } from 'next';
import { I18nProvider } from '../i18n/I18nContext';
import { AppRouterProvider } from './router';
import '../index.css';

const SITE_NAME = 'OKEng';
const SITE_DESCRIPTION =
  'Embedded, file-based product knowledge layer with collection-level access control, citations, and widget embed.';

/** Absolute origin used to resolve relative Open Graph / Twitter image URLs. */
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `lang` is the server-rendered default; I18nProvider (I18N-001 §37) keeps
    // document.documentElement.lang in sync when the user switches language.
    <html lang="en">
      {/* Design-system root tokens (DS-*). `body` already carries the canvas
          background, ink colour, sans font stack and antialiasing from
          index.css; these utilities preserve the previous wrapper <div>. */}
      <body className="min-h-screen bg-canvas text-ink font-sans antialiased selection:bg-accent selection:text-white">
        <I18nProvider>
          <AppRouterProvider>{children}</AppRouterProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
