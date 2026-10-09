import React from 'react';
import { ShieldCheck, Check, Minus } from 'lucide-react';
import {
  Card,
  CardHeader,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  AccessBadge,
  Text,
  InfoPopover,
} from './ui';
import { useI18n } from '../i18n/I18nContext';

// ============================================================================
// UI-01 §2.2 & AUTH-03: Dual RBAC & Pre-Retrieval Clearance Matrix (CO-RBAC-MATRIX)
// Renders the two orthogonal RBAC axes:
//   Axis 1 — Workspace Governance Roles (PLATFORM_ADMIN, WORKSPACE_OWNER, WORKSPACE_USER)
//   Axis 2 — Pre-Retrieval Collection Visibility Tiers (everyone, members, admins)
// ============================================================================

interface CapabilityRow {
  capability: string;
  scope: string;
  owner: boolean;
  member: boolean;
  platformAdmin: string;
}

const CAPABILITY_ROWS: CapabilityRow[] = [
  {
    capability: 'Manage Collections & Visibility Boundaries',
    scope: 'collection:write',
    owner: true,
    member: true,
    platformAdmin: 'Requires active grant',
  },
  {
    capability: 'Author, Re-index & Delete Markdown Documents',
    scope: 'document:write',
    owner: true,
    member: true,
    platformAdmin: 'Requires active grant',
  },
  {
    capability: 'Configure Embeds & Presentation Surfaces',
    scope: 'embed:write',
    owner: true,
    member: true,
    platformAdmin: 'Requires active grant',
  },
  {
    capability: 'Execute Test Console & Inspect Cache Telemetry',
    scope: 'console:execute',
    owner: true,
    member: true,
    platformAdmin: 'Requires active grant',
  },
  {
    capability: 'Invite Members, Transfer Ownership & Rotate HMAC Secret',
    scope: 'workspace:admin',
    owner: true,
    member: false,
    platformAdmin: 'Owner-only',
  },
];

export const RbacMatrix: React.FC = () => {
  const { t } = useI18n();

  return (
    <Card variant="surface" padding="md" className="space-y-4">
      <CardHeader
        icon={<ShieldCheck className="w-4 h-4 text-ink" />}
        title={t('settings.rbac_matrix_title', 'Dual RBAC & Retrieval Clearance Matrix')}
        actions={
          <InfoPopover
            title="Dual RBAC Architecture (AUTH-03)"
            description="OKEng separates Workspace Operator Governance (who can manage collections, files, embeds, and keys) from End-User Retrieval Clearance (which collections are included before vector similarity search)."
            items={[
              { label: 'Axis 1', value: 'Workspace Operator RBAC', mono: false },
              { label: 'Axis 2', value: 'Pre-Retrieval Clearance', mono: false },
              { label: 'Zero-Trust Rule', value: 'Platform Admin requires grant', mono: false },
              { label: 'Specification', value: 'AUTH-03 & SECURITY-001' },
            ]}
          />
        }
      />

      <Text variant="body" tone="secondary">
        {t(
          'settings.rbac_matrix_desc',
          'Workspace operator permissions govern administrative actions inside this console, while collection visibility tiers govern pre-retrieval filtering for end-user queries.'
        )}
      </Text>

      {/* Axis 1: Workspace Operator Governance Matrix */}
      <TableContainer>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Capability</TableHeaderCell>
              <TableHeaderCell>Permission Scope</TableHeaderCell>
              <TableHeaderCell className="text-center">Workspace Owner</TableHeaderCell>
              <TableHeaderCell className="text-center">Workspace User</TableHeaderCell>
              <TableHeaderCell>Platform Admin</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {CAPABILITY_ROWS.map((row) => (
              <TableRow key={row.scope}>
                <TableCell className="font-medium text-ink">{row.capability}</TableCell>
                <TableCell className="font-mono text-2xs text-ink-secondary">
                  {row.scope}
                </TableCell>
                <TableCell className="text-center">
                  {row.owner ? (
                    <Check className="w-4 h-4 text-success inline-block" />
                  ) : (
                    <Minus className="w-4 h-4 text-ink-muted inline-block" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {row.member ? (
                    <Check className="w-4 h-4 text-success inline-block" />
                  ) : (
                    <Minus className="w-4 h-4 text-ink-muted inline-block" />
                  )}
                </TableCell>
                <TableCell>
                  <Badge tone="neutral" mono>
                    {row.platformAdmin}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Axis 2: Pre-Retrieval Collection Clearance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        <div className="p-3 bg-elevated border border-line rounded-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Visitor / Unauthenticated</span>
            <AccessBadge visibility="everyone" />
          </div>
          <p className="text-2xs text-ink-secondary">
            Retrieves only from <strong className="text-ink">Public</strong> collections. Members and
            Admins collections are excluded prior to similarity search.
          </p>
        </div>

        <div className="p-3 bg-elevated border border-line rounded-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Signed Customer / Employee</span>
            <AccessBadge visibility="members" />
          </div>
          <p className="text-2xs text-ink-secondary">
            Retrieves from <strong className="text-ink">Public + Members</strong> collections via
            verified HMAC identity assertion.
          </p>
        </div>

        <div className="p-3 bg-elevated border border-line rounded-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Signed Manager / Admin</span>
            <AccessBadge visibility="admins" />
          </div>
          <p className="text-2xs text-ink-secondary">
            Retrieves across <strong className="text-ink">Public + Members + Admins</strong>{' '}
            collections with full internal runbook clearance.
          </p>
        </div>
      </div>
    </Card>
  );
};
