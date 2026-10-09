'use client';

// ============================================================================
// ARCH-001 & STATE-001: Canonical App Router Not-Found (404) Boundary
// Enforces AUTH-05 §14: Cross-tenant or missing resources return 404 without
// disclosing whether a private workspace or document exists.
// Enforces DS-* Design Tokens, PR-* UI Primitives, and I18N-001 Localization.
// ============================================================================

import React from 'react';
import { Globe } from 'lucide-react';
import { Card, Badge, Text, Button } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { useRouter } from './router';

export default function NotFound() {
  const { t } = useI18n();
  const { push } = useRouter();

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-8">
      <Card variant="surface" padding="md" className="max-w-md w-full space-y-3.5">
        <Badge tone="neutral" mono uppercase>
          {t('boundary.not_found.badge', 'HTTP 404 • NOT_FOUND')}
        </Badge>
        <Text variant="h2" tone="primary">
          {t('boundary.not_found.title', 'Resource Not Found')}
        </Text>
        <Text variant="body" tone="secondary">
          {t(
            'boundary.not_found.desc',
            'The requested page, workspace, or document could not be found in your authorized scope.'
          )}
        </Text>
        <div className="pt-1">
          <Button variant="primary" size="sm" onClick={() => push('/')}>
            <Globe className="w-3.5 h-3.5" />
            <span>{t('boundary.not_found.home', 'Return to Public Home (/)')}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
