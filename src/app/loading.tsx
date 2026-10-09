'use client';

// ============================================================================
// ARCH-001 & STATE-001: Canonical App Router Loading Boundary
// Enforces DS-* Design Tokens, PR-* UI Primitives, and I18N-001 Localization
// ============================================================================

import React from 'react';
import { Card, Text } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';

export default function Loading() {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen bg-canvas flex items-center justify-center p-8"
    >
      <Card variant="surface" padding="sm" className="px-6 py-4">
        <Text variant="mono" tone="secondary">
          {t('boundary.loading.message', 'Loading authorized workspace surface...')}
        </Text>
      </Card>
    </div>
  );
}
