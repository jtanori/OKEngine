import React, { useState } from 'react';
import {
  Key,
  RotateCw,
  Copy,
  Check,
  Building,
  Download,
  Users,
  ShieldCheck,
  UserPlus,
  ArrowRightLeft,
  Globe,
} from 'lucide-react';
import { store } from '../services/store';
import { authService } from '../services/auth';
import { PageHeader } from '../components/PageHeader';
import { RbacMatrix } from '../components/RbacMatrix';
import {
  Card,
  CardHeader,
  Box,
  Text,
  Button,
  Input,
  Select,
  Badge,
  SegmentedTabs,
  Drawer,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  InfoPopover,
} from '../components/ui';
import { WorkspaceMembership, AuditEvent, SupportedLanguage } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { validatePlainText, validateEmailInput } from '../services/formSecurity';

// ============================================================================
// PAGE-APP-08: Workspace Settings & Security (PA-SYSTEM-CONFIGURATION / SU-WORKSPACE-SETTINGS)
//   - Level 2 Context: CO-PAGE-HEADER with [Export Backup JSON] action
//   - Persistent Configuration Navigation (PR-TABS):
//     General | Members & RBAC | Credentials & Keys | Audit Log
//   - Normal page scrolling with bounded active configuration content surface (§2.8)
//   - Composes CO-RBAC-MATRIX (AUTH-03), Default Workspace Language (EN/ES),
//     and PR-DRAWER-SM for Invite Member & Transfer Ownership mutations
// ============================================================================

type SettingsSection = 'general' | 'members_rbac' | 'credentials' | 'audit_log';

export const SettingsView: React.FC = () => {
  const { t } = useI18n();
  const [workspace, setWorkspace] = useState(store.getWorkspace());
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  // General Section State
  const [name, setName] = useState(workspace.name);
  const [defaultLanguage, setDefaultLanguage] = useState<SupportedLanguage>(
    workspace.defaultLanguage || 'en'
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Credentials Section State
  const [isRotatingSecret, setIsRotatingSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Members & Audit Log State
  const [members, setMembers] = useState<WorkspaceMembership[]>(
    authService.getWorkspaceMembers(workspace.slug)
  );
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(
    authService.getAuditEvents(workspace.slug)
  );

  // PR-DRAWER-SM State: Invite Member
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteErrors, setInviteErrors] = useState<{ name?: string; email?: string }>({});
  const [isInviting, setIsInviting] = useState(false);

  // PR-DRAWER-SM State: Transfer Ownership
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedTargetUser, setSelectedTargetUser] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const currentUser = authService.getCurrentUser();
  const reqContext = authService.getRequestContext(workspace.slug);

  const handleExportBackup = () => {
    const archive = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      workspace: store.getWorkspace(),
      collections: store.getCollections(),
      documents: store.getDocuments(),
      conversations: store.getConversations(),
      embedConfig: store.getEmbedConfig(),
      auditLogs: authService.getAuditEvents(store.getWorkspace().slug),
    };
    const blob = new Blob([JSON.stringify(archive, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `okeng-backup-${store.getWorkspace().slug}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingWorkspace) return;

    const nameCheck = validatePlainText(name, {
      required: true,
      minLength: 2,
      maxLength: 80,
      fieldLabel: t('settings.workspace_name', 'Workspace Name'),
    });

    if (!nameCheck.valid) {
      setNameError(t(nameCheck.errorKey || 'validation.required', nameCheck.errorMessage));
      return;
    }

    setNameError(null);
    setIsSavingWorkspace(true);
    setTimeout(() => {
      store.updateWorkspace(nameCheck.sanitizedValue, defaultLanguage);
      setWorkspace(store.getWorkspace());
      setName(nameCheck.sanitizedValue);
      setIsSavingWorkspace(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 180);
  };

  const handleRegenerateSecret = () => {
    if (isRotatingSecret) return;
    setIsRotatingSecret(true);
    setTimeout(() => {
      store.regenerateSecret();
      setWorkspace(store.getWorkspace());
      authService.recordAuditEvent({
        actorUserId: currentUser?.id || 'usr_sarah_102',
        actorEmail: currentUser?.email || 'sarah.chen@acmecloud.io',
        actorPlatformRole: currentUser?.platformRole || null,
        workspaceId: workspace.slug,
        action: 'embed.secret_rotated',
        resourceType: 'embed',
        resourceId: workspace.slug,
        metadata: { reason: 'manual_rotation' },
      });
      setAuditLogs(authService.getAuditEvents(workspace.slug));
      setIsRotatingSecret(false);
    }, 200);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInviting) return;

    const nameCheck = validatePlainText(inviteName, {
      required: true,
      minLength: 2,
      maxLength: 80,
      fieldLabel: t('public.contact.name', 'Name'),
    });
    const emailCheck = validateEmailInput(inviteEmail);

    const nextErrors: { name?: string; email?: string } = {};
    if (!nameCheck.valid) {
      nextErrors.name = t(nameCheck.errorKey || 'validation.required', nameCheck.errorMessage);
    }
    if (!emailCheck.valid) {
      nextErrors.email = t(
        emailCheck.errorKey || 'validation.email_invalid',
        emailCheck.errorMessage
      );
    } else if (
      members.some(
        (m) => (m.userEmail || '').toLowerCase() === emailCheck.sanitizedValue.toLowerCase()
      )
    ) {
      nextErrors.email = t('validation.duplicate_member');
    }

    setInviteErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsInviting(true);
    setTimeout(() => {
      authService.inviteMember(
        workspace.slug,
        emailCheck.sanitizedValue,
        nameCheck.sanitizedValue
      );
      setMembers(authService.getWorkspaceMembers(workspace.slug));
      setAuditLogs(authService.getAuditEvents(workspace.slug));
      setInviteEmail('');
      setInviteName('');
      setInviteErrors({});
      setIsInviting(false);
      setIsInviteOpen(false);
    }, 180);
  };

  const handleTransfer = () => {
    if (isTransferring) return;
    if (!selectedTargetUser) {
      setTransferError(t('validation.select_transfer_target'));
      return;
    }
    setTransferError(null);
    setIsTransferring(true);
    setTimeout(() => {
      authService.transferOwnership(workspace.slug, selectedTargetUser);
      setMembers(authService.getWorkspaceMembers(workspace.slug));
      setAuditLogs(authService.getAuditEvents(workspace.slug));
      setIsTransferring(false);
      setIsTransferOpen(false);
      setSelectedTargetUser('');
    }, 200);
  };

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title={t('settings.title', 'Workspace Settings & Security')}
        description={t(
          'settings.desc',
          'Manage workspace identity, membership access control, HMAC credentials, and review security audit logs.'
        )}
        actions={
          <Button variant="secondary" size="sm" onClick={handleExportBackup}>
            <Download className="w-3.5 h-3.5" />
            <span>{t('settings.backup_button', 'Export Full Workspace Backup (JSON)')}</span>
          </Button>
        }
      />

      {/* Persistent Configuration Navigation Bar (PR-TABS) */}
      <div className="bg-surface border-b border-line px-8 py-2.5 flex items-center justify-between gap-4">
        <SegmentedTabs<SettingsSection>
          size="md"
          activeId={activeSection}
          onChange={setActiveSection}
          options={[
            { id: 'general', label: t('settings.tab_general', 'General') },
            {
              id: 'members_rbac',
              label: `${t('settings.tab_members', 'Members & RBAC')} (${members.length})`,
            },
            { id: 'credentials', label: t('settings.tab_credentials', 'Credentials & Keys') },
            {
              id: 'audit_log',
              label: `${t('settings.tab_audit', 'Audit Log')} (${auditLogs.length})`,
            },
          ]}
        />
        <Badge tone="neutral" mono>
          {workspace.slug}
        </Badge>
      </div>

      {/* Active Configuration Content Surface (Normal Page Scroll, 32px workspace axis: p-8 w-full) */}
      <div className="p-8 w-full space-y-6 select-text">
        {/* SECTION 1: GENERAL (Workspace Identity, Default Language & Backup) */}
        {activeSection === 'general' && (
          <>
            <Card variant="surface" padding="md" className="space-y-4">
              <CardHeader
                icon={<Building className="w-4 h-4 text-ink" />}
                title={t('settings.details_title', 'Workspace Details')}
              />

              <form onSubmit={handleSave} noValidate className="space-y-4 max-w-lg">
                <Input
                  label={t('settings.workspace_name', 'Workspace Name')}
                  placeholder={t('settings.workspace_name_placeholder')}
                  hint={t('settings.workspace_name_hint')}
                  error={nameError || undefined}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  disabled={isSavingWorkspace}
                  required
                />

                <div className="space-y-1 text-left">
                  <Text as="label" variant="h3" tone="primary" className="block">
                    {t('settings.workspace_slug', 'Workspace Slug')}
                  </Text>
                  <Box
                    surface="elevated"
                    padding="xs"
                    radius="sm"
                    className="font-mono text-xs text-ink-secondary"
                  >
                    {workspace.slug}
                  </Box>
                </div>

                {/* Default Workspace Language (I18N-001 & PAGE-APP-08) */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-ink-secondary" />
                    <Text as="label" variant="h3" tone="primary" className="block">
                      {t('settings.default_language', 'Default Workspace Language')}
                    </Text>
                  </div>
                  <Select
                    aria-label={t('settings.default_language', 'Default Workspace Language')}
                    value={defaultLanguage}
                    hint={t(
                      'settings.default_language_hint',
                      'Primary fallback language used for retrieval and answer compilation when caller language is not specified.'
                    )}
                    disabled={isSavingWorkspace}
                    onChange={(e) => setDefaultLanguage(e.target.value as SupportedLanguage)}
                    options={[
                      { value: 'en', label: 'English (EN) — Default' },
                      { value: 'es', label: 'Español (ES)' },
                    ]}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    isLoading={isSavingWorkspace}
                  >
                    {isSaved
                      ? t('common.saved', 'Saved')
                      : t('common.save_changes', 'Save Changes')}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Workspace Archive & Document Export */}
            <Card variant="surface" padding="md" className="space-y-4">
              <CardHeader
                icon={<Download className="w-4 h-4 text-ink" />}
                title={t('settings.backup_title', 'Workspace Archive & Backup')}
              />

              <Text variant="body" tone="secondary" className="max-w-xl">
                Export a full backup archive of your workspace, including collection schemas,
                visibility tiers, all indexed documents with raw markdown and next-step actions, and
                conversation history.
              </Text>

              <div className="pt-1">
                <Button variant="secondary" size="sm" onClick={handleExportBackup}>
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('settings.backup_button', 'Export Full Workspace Backup (JSON)')}</span>
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* SECTION 2: MEMBERS & RBAC (Members Table + Dual RBAC Matrix AUTH-03) */}
        {activeSection === 'members_rbac' && (
          <>
            <Card variant="surface" padding="md" className="space-y-4">
              <CardHeader
                icon={<Users className="w-4 h-4 text-ink" />}
                title={t('settings.members_title', 'Workspace Members & Roles')}
                actions={
                  reqContext.workspaceRole === 'WORKSPACE_OWNER' ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setTransferError(null);
                          setIsTransferOpen(true);
                        }}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>{t('settings.transfer_ownership', 'Transfer Ownership')}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setInviteErrors({});
                          setIsInviteOpen(true);
                        }}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{t('settings.invite_member', 'Invite Member')}</span>
                      </Button>
                    </div>
                  ) : undefined
                }
              />

              <TableContainer>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>User</TableHeaderCell>
                      <TableHeaderCell>Workspace Role</TableHeaderCell>
                      <TableHeaderCell>Permissions</TableHeaderCell>
                      <TableHeaderCell>{t('common.status', 'Status')}</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium text-ink">{m.userName || 'Member'}</div>
                          <Text variant="mono" tone="secondary">
                            {m.userEmail}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <Badge
                            tone={m.role === 'WORKSPACE_OWNER' ? 'ink' : 'neutral'}
                            mono
                            uppercase
                          >
                            {m.role === 'WORKSPACE_OWNER' ? 'Owner' : 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Text variant="mono" tone="primary">
                            {m.role === 'WORKSPACE_OWNER'
                              ? 'Full Authority'
                              : `${m.permissions.length} explicit permissions`}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-2xs text-success">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            <span className="capitalize">{m.status}</span>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>

            {/* Canonical Dual RBAC & Pre-Retrieval Clearance Matrix (CO-RBAC-MATRIX / AUTH-03) */}
            <RbacMatrix />
          </>
        )}

        {/* SECTION 3: CREDENTIALS & KEYS */}
        {activeSection === 'credentials' && (
          <Card variant="surface" padding="md" className="space-y-5">
            <CardHeader
              icon={<Key className="w-4 h-4 text-ink" />}
              title={t('settings.credentials_title', 'Embed & Security Credentials')}
            />

            <div className="space-y-4">
              {/* Public Key */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      label={t('settings.public_key', 'Public Client Key')}
                      type="text"
                      readOnly
                      value={workspace.publicKey}
                      hint={t(
                        'settings.public_key_hint',
                        'Safe to include in frontend embed scripts.'
                      )}
                      className="bg-elevated font-mono"
                    />
                  </div>
                  <div className="pt-6">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(workspace.publicKey, 'pk')}
                    >
                      {copiedKey === 'pk' ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{t('common.copy', 'Copy')}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Signing Secret Key ID (Redacted KMS Reference) */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      label={t('settings.signing_secret', 'HMAC Signing Key ID (KMS Redacted)')}
                      type="text"
                      readOnly
                      value={`${workspace.signingSecretKid || 'kid_okeng_active_v1'} (${workspace.signingSecretPreview || '••••_active_v1'})`}
                      hint={t(
                        'settings.signing_secret_hint',
                        'Used by your backend server to sign user tokens. Raw secret material is KMS-isolated and never exposed to browsers.'
                      )}
                      className="bg-elevated font-mono"
                    />
                  </div>
                  <div className="pt-6 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        copyToClipboard(
                          workspace.signingSecretKid || 'kid_okeng_active_v1',
                          'sk'
                        )
                      }
                    >
                      {copiedKey === 'sk' ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{t('common.copy', 'Copy')}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      isLoading={isRotatingSecret}
                      onClick={handleRegenerateSecret}
                    >
                      {!isRotatingSecret && <RotateCw className="w-3.5 h-3.5" />}
                      <span>{t('settings.regenerate', 'Regenerate')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* SECTION 4: SECURITY AUDIT LOG */}
        {activeSection === 'audit_log' && (
          <Card variant="surface" padding="md" className="space-y-4">
            <CardHeader
              icon={<ShieldCheck className="w-4 h-4 text-ink" />}
              title={t('settings.audit_title', 'Security Audit Log')}
              actions={
                <div className="flex items-center gap-2">
                  <Text variant="mono" tone="secondary" className="tabular-nums">
                    {auditLogs.length}{' '}
                    {t('settings.audit_events_count', 'append-only events recorded')}
                  </Text>
                  <InfoPopover
                    title="Append-Only Security Audit Log"
                    description="Records privileged mutations, membership invites, ownership transfers, and signing secret rotations. Raw secrets and document contents are never stored in audit records."
                    items={[
                      { label: 'Workspace', value: workspace.slug },
                      { label: 'Recorded Events', value: `${auditLogs.length}` },
                      { label: 'Retention Model', value: 'Append-Only (Immutable)', mono: false },
                      { label: 'Security Contract', value: 'AUTH-02 §17 & AUTH-03 §34' },
                    ]}
                  />
                </div>
              }
            />

            <Text variant="body" tone="secondary">
              Chronological audit log of privileged events, membership mutations, collection
              visibility adjustments, and secret rotations. Secrets and customer documents are
              omitted from audit storage.
            </Text>

            <TableContainer>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Timestamp</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                    <TableHeaderCell>Actor</TableHeaderCell>
                    <TableHeaderCell>Resource Details</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => {
                    const friendlyActionLabel: Record<string, string> = {
                      'workspace.created': 'Workspace Created',
                      'collection.visibility_changed': 'Visibility Updated',
                      'embed.secret_rotated': 'Signing Secret Rotated',
                      'membership.invited': 'Member Invited',
                      'workspace.ownership_transferred': 'Ownership Transferred',
                      'admin_grant.created': 'Temporary Admin Access',
                    };
                    const label =
                      friendlyActionLabel[log.action] ||
                      log.action
                        .replace(/[._]/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase());

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-2xs text-ink-secondary whitespace-nowrap tabular-nums">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span title={log.action}>
                            <Badge tone="accent">{label}</Badge>
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-2xs text-ink">
                          {log.actorEmail || log.actorUserId}
                        </TableCell>
                        <TableCell className="text-ink-secondary font-mono text-2xs truncate max-w-xs">
                          {log.metadata
                            ? Object.entries(log.metadata)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' • ')
                            : `${log.resourceType}: ${log.resourceId}`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </div>

      {/* Contextual Slide-In Panel 1: Invite Member (PR-DRAWER-SM) */}
      <Drawer
        isOpen={isInviteOpen}
        onClose={() => !isInviting && setIsInviteOpen(false)}
        size="sm"
        position="right"
        title={t('settings.invite_member', 'Invite Workspace User')}
        subtitle="Grant explicit workspace membership and operator permissions."
        scopeBanner={
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-wider text-ink-muted">Workspace</span>
              <span className="text-ink font-medium">{workspace.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-wider text-ink-muted">Assigned Role</span>
              <Badge tone="neutral" mono uppercase>
                WORKSPACE_USER
              </Badge>
            </div>
          </div>
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={isInviting}
              onClick={() => setIsInviteOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              isLoading={isInviting}
              onClick={handleInvite}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('settings.invite_member', 'Invite Member')}</span>
            </Button>
          </>
        }
      >
        <form onSubmit={handleInvite} noValidate className="space-y-4">
          <Input
            label={t('public.contact.name', 'Name')}
            value={inviteName}
            onChange={(e) => {
              setInviteName(e.target.value);
              if (inviteErrors.name) {
                setInviteErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            placeholder="e.g. Alex Rivera"
            hint={t('settings.invite_name_hint')}
            error={inviteErrors.name}
            disabled={isInviting}
            required
          />
          <Input
            label={t('public.contact.email', 'Email')}
            type="email"
            value={inviteEmail}
            onChange={(e) => {
              setInviteEmail(e.target.value);
              if (inviteErrors.email) {
                setInviteErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            placeholder="alex@acmecloud.io"
            hint={t('settings.invite_email_hint')}
            error={inviteErrors.email}
            disabled={isInviting}
            required
          />
        </form>
      </Drawer>

      {/* Contextual Slide-In Panel 2: Transfer Ownership (PR-DRAWER-SM) */}
      <Drawer
        isOpen={isTransferOpen}
        onClose={() => !isTransferring && setIsTransferOpen(false)}
        size="sm"
        position="right"
        title={t('settings.transfer_ownership', 'Transfer Workspace Ownership')}
        subtitle="Select an existing active Workspace User to receive full ownership authority."
        scopeBanner={
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-wider text-ink-muted">Workspace</span>
              <span className="text-ink font-medium">{workspace.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-wider text-ink-muted">Target Role</span>
              <Badge tone="ink" mono uppercase>
                WORKSPACE_OWNER
              </Badge>
            </div>
          </div>
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={isTransferring}
              onClick={() => setIsTransferOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              isLoading={isTransferring}
              onClick={handleTransfer}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{t('settings.transfer_ownership', 'Confirm Transfer')}</span>
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Box surface="warning" padding="xs" radius="sm">
            <Text variant="caption" tone="warning">
              Ownership transfer is immediate and recorded in the append-only security audit log.
              Your membership will transition to Workspace User.
            </Text>
          </Box>
          <Select
            label="Target Workspace Member"
            aria-label={t('settings.transfer_ownership', 'Transfer Workspace Ownership')}
            value={selectedTargetUser}
            hint={t('settings.transfer_select_hint')}
            error={transferError || undefined}
            disabled={isTransferring}
            onChange={(e) => {
              setSelectedTargetUser(e.target.value);
              if (transferError) setTransferError(null);
            }}
            options={[
              { value: '', label: 'Select target member...' },
              ...members
                .filter((m) => m.role !== 'WORKSPACE_OWNER')
                .map((m) => ({
                  value: m.userId,
                  label: `${m.userName} (${m.userEmail})`,
                })),
            ]}
          />
        </div>
      </Drawer>
    </div>
  );
};
