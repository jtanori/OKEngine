import {
  User,
  Workspace,
  WorkspaceMembership,
  RequestContext,
  AuthorizationDecision,
  WorkspacePermission,
  AuditEvent,
  ApprovalRequest,
  AdminGrant,
  EmbeddedTokenClaims,
  AccessVisibility,
  EnforcementResult,
  Collection,
} from '../types';
import {
  CollectionVisibility,
  EmbedIdentityClaims,
  EmbedIdentity,
  AuthorizationScope,
  EmbedInstallationFacts,
  EmbedVisibilityProfile,
  getEmbedCollectionIds,
  canAccessCollection,
  resolveEmbedAuthorization,
  createEmbedIdentityToken,
  verifyEmbedIdentityToken,
  resolveRequestEmbedIdentity,
  computeEmbedAuthorizationVersion,
  computeAuthorizedKnowledgeVersion,
  retrieveKnowledge,
  resolveAuthorizedCta,
  resolveAuthorizedSuggestions,
  computeEmbedVerificationProof,
  createEmbedRuntimeSession,
  appendImmutableSessionTurn,
  upgradeEmbedSessionIdentity,
  clearanceLabelToEmbedIdentity,
  identityToClearanceTier,
  CLOCK_SKEW_TOLERANCE_SECONDS,
} from './embedAuthorization';

export {
  type CollectionVisibility,
  type EmbedIdentityClaims,
  type EmbedIdentity,
  type AuthorizationScope,
  type EmbedInstallationFacts,
  type EmbedVisibilityProfile,
  getEmbedCollectionIds,
  canAccessCollection,
  resolveEmbedAuthorization,
  createEmbedIdentityToken,
  verifyEmbedIdentityToken,
  resolveRequestEmbedIdentity,
  computeEmbedAuthorizationVersion,
  computeAuthorizedKnowledgeVersion,
  retrieveKnowledge,
  resolveAuthorizedCta,
  resolveAuthorizedSuggestions,
  computeEmbedVerificationProof,
  createEmbedRuntimeSession,
  appendImmutableSessionTurn,
  upgradeEmbedSessionIdentity,
  clearanceLabelToEmbedIdentity,
  identityToClearanceTier,
  CLOCK_SKEW_TOLERANCE_SECONDS,
};

export const ALL_WORKSPACE_PERMISSIONS: WorkspacePermission[] = [
  'workspace.read',
  'workspace.settings.manage',
  'workspace.users.manage',
  'collection.read',
  'collection.write',
  'collection.delete',
  'collection.access.manage',
  'content.read',
  'content.write',
  'content.delete',
  'embed.read',
  'embed.manage',
  'test.execute',
  'conversations.read',
];

export const DEFAULT_USER_PERMISSIONS: WorkspacePermission[] = [
  'workspace.read',
  'collection.read',
  'content.read',
  'test.execute',
];

export const CRITICAL_ACTIONS = [
  'workspace.delete',
  'workspace.transfer_ownership',
  'platform.admin.grant',
  'platform.admin.revoke',
  'platform.settings.change',
  'exceptional_customer_data_access',
];

const STORAGE_KEYS = {
  CURRENT_USER_ID: 'okeng_current_user_id_v2',
  MEMBERSHIPS: 'okeng_memberships_v2',
  AUDIT_LOGS: 'okeng_audit_logs_v2',
  APPROVALS: 'okeng_approvals_v2',
  ADMIN_GRANTS: 'okeng_admin_grants_v2',
};

export const DEMO_USERS: User[] = [
  {
    id: 'usr_sarah_102',
    email: 'sarah.chen@okeng.io',
    name: 'Sarah Chen (OKEng Owner)',
    status: 'ACTIVE',
    platformRole: 'PLATFORM_OWNER',
    createdAt: '2026-09-15T09:00:00Z',
    updatedAt: '2026-10-01T12:00:00Z',
  },
  {
    id: 'usr_marcus_204',
    email: 'marcus.vance@okeng.io',
    name: 'Marcus Vance (Member - Write)',
    status: 'ACTIVE',
    platformRole: null,
    createdAt: '2026-09-18T14:30:00Z',
    updatedAt: '2026-09-18T14:30:00Z',
  },
  {
    id: 'usr_elena_309',
    email: 'elena.rostova@okeng.io',
    name: 'Elena Rostova (Member - Read)',
    status: 'ACTIVE',
    platformRole: null,
    createdAt: '2026-09-22T11:15:00Z',
    updatedAt: '2026-09-22T11:15:00Z',
  },
  {
    id: 'usr_platform_admin_900',
    email: 'devon.k@okeng.internal',
    name: 'Devon K. (Platform Admin)',
    status: 'ACTIVE',
    platformRole: 'PLATFORM_ADMIN',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
];

const DEFAULT_MEMBERSHIPS: WorkspaceMembership[] = [
  {
    id: 'mem_01',
    workspaceId: 'okeng',
    userId: 'usr_sarah_102',
    userEmail: 'sarah.chen@okeng.io',
    userName: 'Sarah Chen',
    role: 'WORKSPACE_OWNER',
    permissions: ALL_WORKSPACE_PERMISSIONS,
    status: 'active',
    createdAt: '2026-09-15T09:00:00Z',
    updatedAt: '2026-09-15T09:00:00Z',
  },
  {
    id: 'mem_02',
    workspaceId: 'okeng',
    userId: 'usr_marcus_204',
    userEmail: 'marcus.vance@okeng.io',
    userName: 'Marcus Vance',
    role: 'WORKSPACE_USER',
    permissions: [
      'workspace.read',
      'collection.read',
      'collection.write',
      'content.read',
      'content.write',
      'embed.read',
      'conversations.read',
      'test.execute',
    ],
    status: 'active',
    createdAt: '2026-09-18T14:30:00Z',
    updatedAt: '2026-09-18T14:30:00Z',
  },
  {
    id: 'mem_03',
    workspaceId: 'okeng',
    userId: 'usr_elena_309',
    userEmail: 'elena.rostova@okeng.io',
    userName: 'Elena Rostova',
    role: 'WORKSPACE_USER',
    permissions: DEFAULT_USER_PERMISSIONS,
    status: 'active',
    createdAt: '2026-09-22T11:15:00Z',
    updatedAt: '2026-09-22T11:15:00Z',
  },
];

const DEFAULT_AUDIT_LOGS: AuditEvent[] = [
  {
    id: 'aud_001',
    actorUserId: 'usr_sarah_102',
    actorEmail: 'sarah.chen@okeng.io',
    actorPlatformRole: 'PLATFORM_OWNER',
    workspaceId: 'okeng',
    action: 'workspace.created',
    resourceType: 'workspace',
    resourceId: 'okeng',
    metadata: { name: 'OKEng', slug: 'okeng', dogfood: true },
    createdAt: '2026-09-15T09:00:00Z',
  },
  {
    id: 'aud_002',
    actorUserId: 'usr_sarah_102',
    actorEmail: 'sarah.chen@okeng.io',
    actorPlatformRole: 'PLATFORM_OWNER',
    workspaceId: 'okeng',
    action: 'collection.access_changed',
    resourceType: 'collection',
    resourceId: 'COL-PUBLIC',
    metadata: { collectionName: 'Public Product Knowledge', visibility: 'everyone' },
    createdAt: '2026-09-16T10:30:00Z',
  },
  {
    id: 'aud_003',
    actorUserId: 'usr_sarah_102',
    actorEmail: 'sarah.chen@okeng.io',
    actorPlatformRole: 'PLATFORM_OWNER',
    workspaceId: 'okeng',
    action: 'membership.created',
    resourceType: 'membership',
    resourceId: 'mem_02',
    metadata: { userEmail: 'marcus.vance@okeng.io', role: 'WORKSPACE_USER' },
    createdAt: '2026-09-18T14:30:00Z',
  },
];

export class AuthService {
  private currentUserId: string | null;
  private memberships: WorkspaceMembership[];
  private auditLogs: AuditEvent[];
  private approvals: ApprovalRequest[];
  private adminGrants: AdminGrant[];
  private listeners: Set<() => void> = new Set();
  private serverAuthMode: 'memory' | 'supabase' | null = null;
  private serverSessionResolved = false;
  private serverUser: User | null = null;
  private serverMemberships: WorkspaceMembership[] = [];
  private serverWorkspace: Workspace | null = null;
  private hydrationRequest: Promise<void> | null = null;

  constructor() {
    // A localStorage persona is not an authentication credential. Start signed
    // out until the same-origin server validates the HttpOnly session cookie.
    this.currentUserId = null;
    this.memberships = this.loadFromStorage(STORAGE_KEYS.MEMBERSHIPS, DEFAULT_MEMBERSHIPS);
    this.auditLogs = this.loadFromStorage(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS);
    this.approvals = this.loadFromStorage(STORAGE_KEYS.APPROVALS, []);
    this.adminGrants = this.loadFromStorage(STORAGE_KEYS.ADMIN_GRANTS, []);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public isSessionResolved(): boolean {
    return this.serverSessionResolved;
  }

  public isSupabaseSessionMode(): boolean {
    return this.serverAuthMode === 'supabase';
  }

  public getActiveWorkspace(): Workspace | null {
    return this.serverAuthMode === 'supabase' ? this.serverWorkspace : null;
  }

  /** Hydrate UI-only identity from a safe same-origin projection; never read JWTs in the browser. */
  public refreshServerSession(): Promise<void> {
    if (this.hydrationRequest) return this.hydrationRequest;

    this.hydrationRequest = (async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Server session unavailable');
        const payload = await response.json();
        if (payload?.mode !== 'memory' && payload?.mode !== 'supabase') {
          throw new Error('Invalid server session response');
        }

        this.serverAuthMode = payload.mode;
        const session = payload.authenticated && payload.session && typeof payload.session === 'object'
          ? payload.session
          : null;
        const createdAtMillis = Number(session?.createdAt);
        const createdAt = new Date(Number.isFinite(createdAtMillis) ? createdAtMillis : Date.now()).toISOString();
        const platformRole = session?.role === 'super_admin'
          ? 'PLATFORM_OWNER'
          : session?.role === 'admin'
            ? 'PLATFORM_ADMIN'
            : null;

        if (payload.mode === 'supabase') {
          this.currentUserId = null;
          this.serverMemberships = [];
          this.serverWorkspace = null;
          this.serverUser = session ? {
            id: String(session.userId),
            email: String(session.email),
            name: String(session.name || String(session.email).split('@')[0]),
            status: 'ACTIVE',
            platformRole,
            createdAt,
            updatedAt: createdAt,
          } : null;

          if (session?.workspaceId && (session.workspaceRole === 'WORKSPACE_OWNER' || session.workspaceRole === 'WORKSPACE_USER')) {
            this.serverMemberships = [{
              id: `server-${session.workspaceId}-${session.userId}`,
              workspaceId: String(session.workspaceId),
              userId: String(session.userId),
              userEmail: String(session.email),
              userName: String(session.name || String(session.email).split('@')[0]),
              role: session.workspaceRole,
              permissions: Array.isArray(session.permissions)
                ? session.permissions.filter((permission: unknown): permission is WorkspacePermission => typeof permission === 'string')
                : [],
              status: 'active',
              createdAt,
              updatedAt: createdAt,
            }];
          }

          if (session?.workspaceId && session?.workspaceSlug) {
            this.serverWorkspace = {
              id: String(session.workspaceId),
              slug: String(session.workspaceSlug),
              name: String(session.workspaceName || session.workspaceSlug),
              publicKey: '',
              createdAt,
            };
          }
        } else {
          this.currentUserId = session?.userId ? String(session.userId) : null;
          this.serverUser = session ? {
            id: String(session.userId),
            email: String(session.email),
            name: String(session.name || String(session.email).split('@')[0]),
            status: 'ACTIVE',
            platformRole,
            createdAt,
            updatedAt: createdAt,
          } : null;
          this.serverMemberships = [];
          this.serverWorkspace = null;
        }
      } catch {
        // If session resolution fails, do not reuse localStorage personas as auth.
        this.serverAuthMode = 'supabase';
        this.currentUserId = null;
        this.serverUser = null;
        this.serverMemberships = [];
        this.serverWorkspace = null;
      } finally {
        this.serverSessionResolved = true;
        this.hydrationRequest = null;
        this.notify();
      }
    })();

    return this.hydrationRequest;
  }

  public async signOut(): Promise<boolean> {
    try {
      const csrfResponse = await fetch('/api/csrf-token', { cache: 'no-store', credentials: 'same-origin' });
      if (!csrfResponse.ok) return false;
      const { csrfToken } = await csrfResponse.json();
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'x-csrf-token': String(csrfToken || '') },
      });
      if (!response.ok) return false;

      this.currentUserId = null;
      this.serverUser = null;
      this.serverMemberships = [];
      this.serverWorkspace = null;
      this.serverSessionResolved = true;
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  private loadFromStorage<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) {
          try {
            return JSON.parse(raw);
          } catch {
            // Tolerate legacy plain-string writes (e.g. "usr_sarah_102" without quotes)
            // from manual console snippets — treat raw as value if it looks like a user id.
            if (typeof fallback === 'string' || fallback === null) {
              if (raw.startsWith('usr_') || raw.startsWith('"usr_')) {
                const cleaned = raw.replace(/^"+|"+$/g, '');
                return cleaned as unknown as T;
              }
            }
            // For other keys, if parse failed, fall back
            console.warn(`Failed to parse ${key} as JSON, using fallback. raw=`, raw);
            return fallback;
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to load ${key} from storage:`, e);
    }
    return fallback;
  }

  private saveToStorage(key: string, data: any): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      console.warn(`Failed to save ${key} to storage:`, e);
    }
  }

  public getPersonas(): User[] {
    return this.serverAuthMode === 'supabase' ? [] : DEMO_USERS;
  }

  public getCurrentUser(): User | null {
    if (this.serverAuthMode === 'supabase') return this.serverUser;
    if (!this.currentUserId) return null;
    const demoMatch = DEMO_USERS.find((u) => u.id === this.currentUserId);
    if (demoMatch) return demoMatch;
    if (this.serverUser?.id === this.currentUserId) return this.serverUser;

    const memberMatch = this.memberships.find((m) => m.userId === this.currentUserId);
    if (memberMatch) {
      return {
        id: memberMatch.userId,
        email: memberMatch.userEmail || 'member@okeng.io',
        name: memberMatch.userName || 'Workspace Member',
        status: 'ACTIVE',
        platformRole: null,
        createdAt: memberMatch.createdAt,
        updatedAt: memberMatch.updatedAt,
      };
    }
    return null;
  }

  public switchPersona(userId: string | null): void {
    if (this.serverAuthMode === 'supabase') return;
    this.currentUserId = userId;
    this.saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, userId);
    const activeUser = this.getCurrentUser();
    if (activeUser) {
      this.recordAuditEvent({
        actorUserId: activeUser.id,
        actorEmail: activeUser.email,
        actorPlatformRole: activeUser.platformRole,
        workspaceId: 'okeng',
        action: 'auth.login',
        resourceType: 'session',
        resourceId: 'sess_' + activeUser.id.substring(4),
        metadata: { method: 'session_switch' },
      });
    }
    this.notify();
  }

  public getRequestContext(workspaceId: string = 'okeng'): RequestContext {
    if (this.serverAuthMode === 'supabase') {
      const user = this.serverUser;
      const membership = this.serverMemberships.find((candidate) =>
        candidate.workspaceId === workspaceId ||
        (candidate.workspaceId === this.serverWorkspace?.id && this.serverWorkspace?.slug === workspaceId)
      );
      const resolvedWorkspaceId = membership?.workspaceId ||
        (this.serverWorkspace?.slug === workspaceId ? this.serverWorkspace.id : workspaceId);
      if (!user) {
        return {
          userId: '',
          platformRole: null,
          workspaceId: resolvedWorkspaceId,
          workspaceRole: 'WORKSPACE_USER',
          permissions: [],
          authMethod: 'session',
        };
      }
      return {
        userId: user.id,
        platformRole: user.platformRole,
        workspaceId: resolvedWorkspaceId,
        workspaceRole: membership?.role || 'WORKSPACE_USER',
        permissions: membership?.role === 'WORKSPACE_OWNER' ? ALL_WORKSPACE_PERMISSIONS : membership?.permissions || [],
        authMethod: 'session',
        sessionId: `supabase-${user.id}`,
      };
    }

    const normalizedWs = workspaceId === 'acme-cloud' ? 'okeng' : workspaceId;
    const user = this.getCurrentUser();
    if (!user) {
      return {
        userId: '',
        platformRole: null,
        workspaceId: normalizedWs,
        workspaceRole: 'WORKSPACE_USER',
        permissions: [],
        authMethod: 'session',
      };
    }

    const membership = this.memberships.find(
      (m) => m.userId === user.id && m.workspaceId === normalizedWs && m.status === 'active'
    );

    const effectiveRole = membership ? membership.role : 'WORKSPACE_USER';
    const effectivePermissions = membership
      ? membership.role === 'WORKSPACE_OWNER'
        ? ALL_WORKSPACE_PERMISSIONS
        : membership.permissions
      : [];

    return {
      userId: user.id,
      platformRole: user.platformRole,
      workspaceId: normalizedWs,
      workspaceRole: effectiveRole,
      permissions: effectivePermissions,
      authMethod: 'session',
      sessionId: 'sess_' + user.id.substring(4),
    };
  }

  // AUTH-05 §3: Mandatory 5-Link Authorization Chain for Workspace Requests
  public enforceWorkspaceAccess(
    workspaceId: string = 'okeng',
    requiredPermission?: WorkspacePermission,
    resource?: { workspaceId?: string }
  ): EnforcementResult {
    if (this.serverAuthMode === 'supabase') {
      const user = this.serverUser;
      if (!user || user.status !== 'ACTIVE') {
        return { authorized: false, status: 401, error: 'AUTHENTICATION_REQUIRED' };
      }
      const membership = this.serverMemberships.find((candidate) =>
        candidate.workspaceId === workspaceId ||
        (candidate.workspaceId === this.serverWorkspace?.id && this.serverWorkspace?.slug === workspaceId)
      );
      if (!membership) {
        return { authorized: false, status: 403, error: 'WORKSPACE_MEMBERSHIP_REQUIRED' };
      }

      const context = this.getRequestContext(membership.workspaceId);
      if (requiredPermission) {
        const decision = this.authorize(context, requiredPermission, resource);
        if (!decision.allowed) {
          return {
            authorized: false,
            status: decision.reason === 'CROSS_WORKSPACE_FORBIDDEN' ? 404 : 403,
            error: decision.reason || 'MISSING_EXPLICIT_PERMISSION',
            context,
          };
        }
      }
      if (resource?.workspaceId && resource.workspaceId !== membership.workspaceId) {
        return { authorized: false, status: 404, error: 'RESOURCE_WORKSPACE_MISMATCH', context };
      }
      return { authorized: true, status: 200, context };
    }

    const user = this.getCurrentUser();

    // Link 1: Valid authentication
    if (!user || user.status !== 'ACTIVE') {
      return {
        authorized: false,
        status: 401,
        error: 'AUTHENTICATION_REQUIRED',
      };
    }

    // Link 2: Valid workspace
    if (workspaceId !== 'okeng' && workspaceId !== 'acme-cloud') {
      return {
        authorized: false,
        status: 404,
        error: 'WORKSPACE_NOT_FOUND',
      };
    }

    const targetWs = 'okeng';

    // Link 3: Active workspace membership (or explicit Platform Admin bypass grant)
    const membership = this.memberships.find(
      (m) => m.userId === user.id && m.workspaceId === targetWs && m.status === 'active'
    );

    const activeBypassGrant =
      user.platformRole === 'PLATFORM_ADMIN'
        ? this.adminGrants.find(
            (g) =>
              g.userId === user.id &&
              g.permission === 'customer_data.exceptional_access' &&
              !g.revokedAt &&
              new Date(g.expiresAt).getTime() > Date.now()
          )
        : undefined;

    if (!membership && !activeBypassGrant) {
      return {
        authorized: false,
        status: 403,
        error:
          user.platformRole === 'PLATFORM_ADMIN'
            ? 'PLATFORM_ADMIN_NO_WORKSPACE_MEMBERSHIP'
            : 'WORKSPACE_MEMBERSHIP_REQUIRED',
      };
    }

    const context: RequestContext = {
      userId: user.id,
      platformRole: user.platformRole,
      workspaceId: targetWs,
      workspaceRole: membership ? membership.role : 'WORKSPACE_USER',
      permissions: membership
        ? membership.role === 'WORKSPACE_OWNER'
          ? ALL_WORKSPACE_PERMISSIONS
          : membership.permissions
        : activeBypassGrant
        ? ['workspace.read', 'collection.read', 'content.read', 'conversations.read']
        : [],
      authMethod: 'session',
      sessionId: 'sess_' + user.id.substring(4),
    };

    // Link 4: Required permission
    if (requiredPermission) {
      const decision = this.authorize(context, requiredPermission, resource);
      if (!decision.allowed) {
        return {
          authorized: false,
          status: decision.reason === 'CROSS_WORKSPACE_FORBIDDEN' ? 404 : 403,
          error: decision.reason || 'MISSING_EXPLICIT_PERMISSION',
          context,
        };
      }
    }

    // Link 5: Resource belongs to workspace
    if (resource && resource.workspaceId && resource.workspaceId !== targetWs) {
      return {
        authorized: false,
        status: 404,
        error: 'RESOURCE_WORKSPACE_MISMATCH',
        context,
      };
    }

    return {
      authorized: true,
      status: 200,
      context,
    };
  }

  public authorize(
    ctx: RequestContext,
    action: WorkspacePermission | string,
    resource?: { workspaceId?: string; [key: string]: any }
  ): AuthorizationDecision {
    if (!ctx || !ctx.userId) {
      return { allowed: false, reason: 'UNAUTHENTICATED', permission: action };
    }

    if (resource && resource.workspaceId && resource.workspaceId !== ctx.workspaceId) {
      return {
        allowed: false,
        reason: 'CROSS_WORKSPACE_FORBIDDEN',
        permission: action,
        resource: resource.workspaceId,
      };
    }

    if (ctx.workspaceRole === 'WORKSPACE_OWNER') {
      return { allowed: true, permission: action };
    }

    const hasPermission = ctx.permissions.includes(action as WorkspacePermission);
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'MISSING_EXPLICIT_PERMISSION',
        permission: action,
      };
    }

    return { allowed: true, permission: action };
  }

  public authorizeCritical(
    ctx: RequestContext,
    action: string,
    resource?: any
  ): AuthorizationDecision {
    if (!CRITICAL_ACTIONS.includes(action)) {
      return this.authorize(ctx, action, resource);
    }

    if (action.startsWith('workspace.') && ctx.workspaceRole === 'WORKSPACE_OWNER') {
      return { allowed: true, permission: action, requires_approval: false };
    }

    if (ctx.platformRole === 'PLATFORM_OWNER') {
      return { allowed: true, permission: action, requires_approval: false };
    }

    if (ctx.platformRole === 'PLATFORM_ADMIN') {
      const activeGrant = this.adminGrants.find(
        (g) =>
          g.userId === ctx.userId &&
          (g.permission === action || g.permission === 'customer_data.exceptional_access') &&
          !g.revokedAt &&
          new Date(g.expiresAt).getTime() > Date.now()
      );
      if (activeGrant) {
        return { allowed: true, permission: action, requires_approval: false };
      }
      return {
        allowed: false,
        reason: 'OWNER_APPROVAL_REQUIRED',
        permission: action,
        requires_approval: true,
      };
    }

    return { allowed: false, reason: 'UNAUTHORIZED_CRITICAL_ACTION', permission: action };
  }

  public mapCustomerRoleToClearance(externalRole: string): AccessVisibility {
    const normalized = (externalRole || '').toLowerCase().trim();
    if (normalized === 'admin' || normalized === 'admins' || normalized === 'manager') {
      return 'admins';
    }
    if (
      normalized === 'member' ||
      normalized === 'members' ||
      normalized === 'user' ||
      normalized === 'customer' ||
      normalized === 'employee'
    ) {
      return 'members';
    }
    return 'everyone';
  }

  public canAccessCollection(
    identityOrRole: EmbedIdentity | string,
    visibility: AccessVisibility
  ): boolean {
    if (typeof identityOrRole === 'object' && identityOrRole !== null && 'kind' in identityOrRole) {
      return canAccessCollection(identityOrRole, visibility);
    }
    const clearance = this.mapCustomerRoleToClearance(String(identityOrRole || ''));
    if (visibility === 'everyone') return true;
    if (visibility === 'members') return clearance === 'members' || clearance === 'admins';
    if (visibility === 'admins') return clearance === 'admins';
    return false;
  }

  public resolveEmbedAuthorization(
    identity: EmbedIdentity,
    embedCollectionIds: readonly string[],
    collections: readonly Pick<Collection, 'id' | 'visibility'>[]
  ): AuthorizationScope {
    return resolveEmbedAuthorization(identity, embedCollectionIds, collections);
  }

  public async createSignedToken(
    claims: EmbeddedTokenClaims,
    signingSecret: string
  ): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(claims))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const message = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingSecret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuf = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuf)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${message}.${signature}`;
  }

  public async verifyEmbeddedToken(
    token: string,
    expectedWorkspaceId: string,
    signingSecret: string,
    expectedEmbedId?: string
  ): Promise<{ valid: boolean; status?: 200 | 401 | 404; claims?: EmbeddedTokenClaims; error?: string }> {
    if (!token || typeof token !== 'string') {
      return { valid: false, status: 401, error: 'MISSING_TOKEN' };
    }

    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      return { valid: false, status: 401, error: 'MALFORMED_JWT_STRUCTURE' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // 1. Strict alg === "HS256" & Server-Side Key Selection Check
    let parsedHeader: Record<string, unknown>;
    try {
      const headerBase64 = encodedHeader.replace(/-/g, '+').replace(/_/g, '/');
      const padHeader = (4 - (headerBase64.length % 4)) % 4;
      parsedHeader = JSON.parse(atob(headerBase64 + '='.repeat(padHeader)));
    } catch {
      return { valid: false, status: 401, error: 'MALFORMED_JWT_HEADER' };
    }

    if (
      !parsedHeader ||
      parsedHeader.alg !== 'HS256' ||
      (parsedHeader.typ !== undefined && parsedHeader.typ !== 'JWT')
    ) {
      return { valid: false, status: 401, error: 'UNSUPPORTED_JWT_ALGORITHM' };
    }

    if (
      parsedHeader.jku !== undefined ||
      parsedHeader.x5u !== undefined ||
      parsedHeader.jwk !== undefined
    ) {
      return { valid: false, status: 401, error: 'FORBIDDEN_KEY_INJECTION_HEADER' };
    }

    const message = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingSecret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    let sigBytes: Uint8Array;
    try {
      const sigBase64 = signature.replace(/-/g, '+').replace(/_/g, '/');
      const padLen = (4 - (sigBase64.length % 4)) % 4;
      const paddedSig = sigBase64 + '='.repeat(padLen);
      const rawSigStr = atob(paddedSig);
      sigBytes = new Uint8Array(rawSigStr.length);
      for (let i = 0; i < rawSigStr.length; i++) sigBytes[i] = rawSigStr.charCodeAt(i);
    } catch {
      return { valid: false, status: 401, error: 'INVALID_SIGNATURE' };
    }

    const isValidSig = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      sigBytes as BufferSource,
      encoder.encode(message)
    );
    if (!isValidSig) {
      return { valid: false, status: 401, error: 'INVALID_SIGNATURE' };
    }

    let claims: EmbeddedTokenClaims;
    try {
      const payloadBase64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const padLenPayload = (4 - (payloadBase64.length % 4)) % 4;
      claims = JSON.parse(atob(payloadBase64 + '='.repeat(padLenPayload)));
    } catch {
      return { valid: false, status: 401, error: 'INVALID_PAYLOAD' };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (claims.iat && claims.iat > nowSec + CLOCK_SKEW_TOLERANCE_SECONDS) {
      return { valid: false, status: 401, error: 'TOKEN_NOT_YET_VALID', claims };
    }
    if (claims.exp && claims.exp < nowSec - CLOCK_SKEW_TOLERANCE_SECONDS) {
      return { valid: false, status: 401, error: 'TOKEN_EXPIRED', claims };
    }

    const okengAliases = new Set(['okeng', 'ws_okeng_01', 'acme-cloud']);
    const wsMatch =
      claims.workspace_id === expectedWorkspaceId ||
      (okengAliases.has(claims.workspace_id) && okengAliases.has(expectedWorkspaceId));
    if (!wsMatch) {
      return { valid: false, status: 404, error: 'WORKSPACE_MISMATCH', claims };
    }

    if (claims.embed_id && expectedEmbedId && claims.embed_id !== expectedEmbedId) {
      return { valid: false, status: 404, error: 'EMBED_MISMATCH', claims };
    }

    return { valid: true, status: 200, claims };
  }

  public getAdminGrants(): AdminGrant[] {
    return this.adminGrants;
  }

  public grantExceptionalAccess(adminUserId: string, reason: string): AdminGrant {
    const grant: AdminGrant = {
      id: 'grt_' + Date.now(),
      userId: adminUserId,
      permission: 'customer_data.exceptional_access',
      grantedBy: 'usr_sarah_102',
      reason,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    this.adminGrants.unshift(grant);
    this.saveToStorage(STORAGE_KEYS.ADMIN_GRANTS, this.adminGrants);

    this.recordAuditEvent({
      actorUserId: 'usr_sarah_102',
      actorEmail: 'sarah.chen@okeng.io',
      actorPlatformRole: 'PLATFORM_OWNER',
      workspaceId: 'okeng',
      action: 'exceptional_access.granted',
      resourceType: 'admin_grant',
      resourceId: grant.id,
      metadata: { targetAdminId: adminUserId, reason, expiresInMinutes: 30 },
    });
    this.notify();
    return grant;
  }

  public revokeExceptionalAccess(grantId: string): void {
    const grant = this.adminGrants.find((g) => g.id === grantId);
    if (!grant) return;
    grant.revokedAt = new Date().toISOString();
    this.saveToStorage(STORAGE_KEYS.ADMIN_GRANTS, this.adminGrants);

    this.recordAuditEvent({
      actorUserId: 'usr_sarah_102',
      actorEmail: 'sarah.chen@okeng.io',
      actorPlatformRole: 'PLATFORM_OWNER',
      workspaceId: 'okeng',
      action: 'exceptional_access.revoked',
      resourceType: 'admin_grant',
      resourceId: grant.id,
      metadata: { targetAdminId: grant.userId },
    });
    this.notify();
  }

  public recordAuditEvent(event: Omit<AuditEvent, 'id' | 'createdAt'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(fullEvent);
    this.saveToStorage(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
    return fullEvent;
  }

  public getAuditEvents(workspaceId: string = 'okeng'): AuditEvent[] {
    const target = workspaceId === 'acme-cloud' ? 'okeng' : workspaceId;
    return this.auditLogs.filter((a) => a.workspaceId === target);
  }

  public getWorkspaceMembers(workspaceId: string = 'okeng'): WorkspaceMembership[] {
    const target = workspaceId === 'acme-cloud' ? 'okeng' : workspaceId;
    return this.memberships.filter((m) => m.workspaceId === target);
  }

  public inviteMember(
    workspaceId: string,
    email: string,
    name: string,
    permissions: WorkspacePermission[] = DEFAULT_USER_PERMISSIONS
  ): WorkspaceMembership {
    const target = workspaceId === 'acme-cloud' ? 'okeng' : workspaceId;
    const user = this.getCurrentUser();
    const newMember: WorkspaceMembership = {
      id: 'mem_' + Date.now(),
      workspaceId: target,
      userId: 'usr_' + Date.now(),
      userEmail: email,
      userName: name,
      role: 'WORKSPACE_USER',
      permissions,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memberships.push(newMember);
    this.saveToStorage(STORAGE_KEYS.MEMBERSHIPS, this.memberships);

    this.recordAuditEvent({
      actorUserId: user?.id || 'usr_system',
      actorEmail: user?.email,
      actorPlatformRole: user?.platformRole || null,
      workspaceId: target,
      action: 'membership.created',
      resourceType: 'membership',
      resourceId: newMember.id,
      metadata: { userEmail: email, role: 'WORKSPACE_USER', permissionsCount: permissions.length },
    });
    this.notify();
    return newMember;
  }

  public updateMemberPermissions(
    membershipId: string,
    permissions: WorkspacePermission[]
  ): void {
    const user = this.getCurrentUser();
    const member = this.memberships.find((m) => m.id === membershipId);
    if (!member) return;

    member.permissions = permissions;
    member.updatedAt = new Date().toISOString();
    this.saveToStorage(STORAGE_KEYS.MEMBERSHIPS, this.memberships);

    this.recordAuditEvent({
      actorUserId: user?.id || 'usr_system',
      actorEmail: user?.email,
      actorPlatformRole: user?.platformRole || null,
      workspaceId: member.workspaceId,
      action: 'membership.permissions_changed',
      resourceType: 'membership',
      resourceId: member.id,
      metadata: { userEmail: member.userEmail, newPermissionsCount: permissions.length },
    });
    this.notify();
  }

  public transferOwnership(workspaceId: string, targetUserId: string): boolean {
    const target = workspaceId === 'acme-cloud' ? 'okeng' : workspaceId;
    const currentOwner = this.memberships.find(
      (m) => m.workspaceId === target && m.role === 'WORKSPACE_OWNER'
    );
    const targetMember = this.memberships.find(
      (m) => m.workspaceId === target && m.userId === targetUserId
    );

    if (!currentOwner || !targetMember) return false;

    currentOwner.role = 'WORKSPACE_USER';
    currentOwner.permissions = DEFAULT_USER_PERMISSIONS;
    currentOwner.updatedAt = new Date().toISOString();

    targetMember.role = 'WORKSPACE_OWNER';
    targetMember.permissions = ALL_WORKSPACE_PERMISSIONS;
    targetMember.updatedAt = new Date().toISOString();

    this.saveToStorage(STORAGE_KEYS.MEMBERSHIPS, this.memberships);

    this.recordAuditEvent({
      actorUserId: currentOwner.userId,
      actorEmail: currentOwner.userEmail,
      actorPlatformRole: null,
      workspaceId: target,
      action: 'workspace.ownership_transferred',
      resourceType: 'workspace',
      resourceId: target,
      metadata: { fromUserId: currentOwner.userId, toUserId: targetMember.userId },
    });
    this.notify();
    return true;
  }
}

export const authService = new AuthService();
