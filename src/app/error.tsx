'use client';

// ============================================================================
// ARCH-001 & STATE-001: Canonical App Router Error Boundary ("use client")
// Enforces DS-* Design Tokens, PR-* UI Primitives, and I18N-001 Localization
// ============================================================================

import React from 'react';
import { Card, Badge, Text, Button } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <div
      role="alert"
      className="min-h-screen bg-canvas flex items-center justify-center p-8"
    >
      <Card variant="surface" padding="md" className="max-w-md w-full space-y-4">
        <Badge tone="danger" mono uppercase>
          {t('boundary.error.badge', 'Surface Error Boundary')}
        </Badge>
        <Text variant="h2" tone="primary">
          {t('boundary.error.title', 'Unable to render requested view')}
        </Text>
        <Text variant="body" tone="secondary">
          {error?.message || t('boundary.error.default_msg', 'An unexpected application error occurred.')}
        </Text>
        <div>
          <Button type="button" variant="primary" size="sm" onClick={reset}>
            {t('boundary.error.retry', 'Retry surface')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
