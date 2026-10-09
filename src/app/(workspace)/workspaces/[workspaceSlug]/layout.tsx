'use client';

// ============================================================================
// ARCH-001 §5.1 & AUTH-05 §3/§17: Workspace Route Group Layout (SURF-APP)
// Enforces 5-Link Authorization Chain before rendering any /workspaces/[slug]/* route
// ============================================================================

import React from 'react';
import { ShieldAlert, KeyRound, UserCheck, Globe } from 'lucide-react';
import { AppShell } from '../../../../components/AppShell';
import { Card, Box, Badge, Text, Button, InfoPopover } from '../../../../components/ui';
import { authService } from '../../../../services/auth';
import { useParams, useAppRoute, useRouter } from '../../../router';
import { useI18n } from '../../../../i18n/I18nContext';
import LoginPage from '../../../(auth)/login/page';

export default function WorkspaceLayout({
  children,
  workspaceSlug: propSlug,
}: {
  children: React.ReactNode;
  workspaceSlug?: string;
}) {
  const params = useParams<{ workspaceSlug?: string }>();
  const appRoute = useAppRoute();
  const { navigateRoute } = useRouter();
  const { t } = useI18n();

  const workspaceSlug = propSlug || params.workspaceSlug || 'okeng';

  // Enforce 5-Link Workspace Authorization Chain (AUTH-05 §3)
  const enforcement = authService.enforceWorkspaceAccess(workspaceSlug);
  const currentUser = authService.getCurrentUser();

  // State 1 (AUTH-05 §17): Unauthenticated -> Redirect to Login on Auth Surface
  if (enforcement.status === 401) {
    return (
      <LoginPage
        authRedirectMessage={`Please sign in to access the ${workspaceSlug} workspace.`}
      />
    );
  }

  // State 3 (AUTH-05 §17): Authenticated, Unauthorized Workspace (e.g., Platform Admin without membership)
  if (!enforcement.authorized) {
    return (
      <AppShell
        currentRoute={appRoute}
        onRouteChange={(r, rParams) => navigateRoute(r, { workspaceSlug, ...rParams })}
      >
        <div className="flex-1 flex items-center justify-center p-8">
          <Card variant="surface" padding="lg" className="max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-danger">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <Badge tone="danger">Access Restricted</Badge>
              </div>
              <InfoPopover
                title="Workspace Authorization Details"
                description="Platform roles and customer workspace memberships are strictly separated."
                items={[
                  { label: 'Workspace', value: workspaceSlug },
                  { label: 'Signed-In User', value: currentUser?.email || 'Unknown' },
                  {
                    label: 'Platform Role',
                    value: currentUser?.platformRole || 'Standard User',
                  },
                  {
                    label: 'HTTP Status',
                    value: `${enforcement.status} (${enforcement.error})`,
                  },
                  {
                    label: 'Security Contract',
                    value: 'AUTH-04 §8 & AUTH-05 INV-05',
                  },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Text variant="h1" tone="primary">
                {t('auth_gate.denied_title', 'Workspace Access Denied')}
              </Text>
              <Text variant="body" tone="secondary">
                {t(
                  'auth_gate.denied_desc',
                  'You are signed in, but your account is not an active member of this workspace.'
                )}{' '}
                (<span className="font-semibold text-ink">{currentUser?.name}</span>)
              </Text>
              <Box
                surface="elevated"
                padding="xs"
                radius="sm"
                className="text-xs text-ink-secondary leading-relaxed"
              >
                {t(
                  'auth_gate.invariant_note',
                  'Platform roles and customer workspace roles are separate security domains. Platform administrators do not automatically receive access to customer workspaces without an explicit owner grant.'
                )}
              </Box>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => authService.switchPersona('usr_sarah_102')}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t('auth_gate.switch_owner', 'Switch to Sarah Chen (Workspace Owner)')}</span>
              </Button>

              {currentUser?.platformRole === 'PLATFORM_ADMIN' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    authService.grantExceptionalAccess(
                      currentUser.id,
                      'Emergency support investigation approved by Platform Owner'
                    );
                  }}
                >
                  <KeyRound className="w-3.5 h-3.5 text-accent" />
                  <span>
                    {t('auth_gate.simulate_grant', 'Simulate Owner-Approved Temporary Access (30m)')}
                  </span>
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigateRoute('public-surface')}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{t('auth_gate.return_home', 'Return to Public Website')}</span>
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  // State 4 (AUTH-05 §17): Authenticated and Authorized Workspace Member
  return (
    <AppShell
      currentRoute={appRoute}
      onRouteChange={(r, rParams) => navigateRoute(r, { workspaceSlug, ...rParams })}
    >
      {children}
    </AppShell>
  );
}
