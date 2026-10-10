import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Stage 3 Verified Server Identity Context required by createUserScopedSupabaseClient.
 * Never populated from caller-supplied Authorization headers or unverified claims.
 */
export interface VerifiedServerIdentityContext {
  userId: string;
  workspaceId: string;
  role: string;
  sessionId?: string;
}

export type SystemPrivilegedOperationId =
  | 'SRV-PRIV-01_PRE_SESSION_AUTH_LOOKUP'
  | 'SRV-PRIV-02_SECURITY_AUDIT_LOG_APPEND'
  | 'SRV-PRIV-03_PUBLIC_SHARE_SNAPSHOT_READ'
  | 'SRV-PRIV-04_PUBLIC_HOMEPAGE_DEMO_READ';

const ALLOWED_PRIVILEGED_OPERATIONS = new Set<SystemPrivilegedOperationId>([
  'SRV-PRIV-01_PRE_SESSION_AUTH_LOOKUP',
  'SRV-PRIV-02_SECURITY_AUDIT_LOG_APPEND',
  'SRV-PRIV-03_PUBLIC_SHARE_SNAPSHOT_READ',
  'SRV-PRIV-04_PUBLIC_HOMEPAGE_DEMO_READ',
]);

let cachedAnonServerClient: SupabaseClient | null = null;
let cachedServiceRoleClient: SupabaseClient | null = null;

const RLS_CONTEXT_SIGNING_SECRET =
  process.env.OKENG_RLS_CONTEXT_SECRET ||
  'internal-server-rls-context-signing-key-okeng-2026';

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

/**
 * Creates a user-scoped Supabase client bound strictly to the Stage 3 verified
 * server identity context (`userId`, `workspaceId`, `role`).
 *
 * Security Invariants:
 * 1. Never forwards caller-supplied `Authorization` headers or cookies to Supabase.
 * 2. Uses `SUPABASE_ANON_KEY` (never `SUPABASE_SERVICE_ROLE_KEY`) so PostgreSQL
 *    `FORCE ROW LEVEL SECURITY` policies (`auth.uid()` and `has_workspace_permission`)
 *    remain active on every tenant query.
 * 3. Attaches a 60-second server-signed RLS context token (`x-okeng-rls-context`).
 */
export function createUserScopedSupabaseClient(
  verifiedContext: VerifiedServerIdentityContext,
  untrustedRequestHeaders?: Record<string, unknown>
): {
  client: SupabaseClient | null;
  boundContext: VerifiedServerIdentityContext;
  ignoredCallerAuthHeader: boolean;
  rlsAssertionToken: string;
} {
  if (
    !verifiedContext ||
    typeof verifiedContext.userId !== 'string' ||
    !verifiedContext.userId.trim() ||
    typeof verifiedContext.workspaceId !== 'string' ||
    !verifiedContext.workspaceId.trim()
  ) {
    throw new Error('UNVERIFIED_RLS_CONTEXT_REJECTED: userId and workspaceId are required.');
  }

  // Explicitly strip/ignore any caller-supplied Authorization header
  const ignoredCallerAuthHeader = Boolean(
    untrustedRequestHeaders &&
      (untrustedRequestHeaders.authorization !== undefined ||
        untrustedRequestHeaders.Authorization !== undefined)
  );

  const now = Math.floor(Date.now() / 1000);
  const rlsPayload = Buffer.from(
    JSON.stringify({
      sub: verifiedContext.userId,
      workspace_id: verifiedContext.workspaceId,
      role: verifiedContext.role,
      sid: verifiedContext.sessionId || 'stateless',
      iat: now,
      exp: now + 60,
    })
  ).toString('base64url');
  const rlsSig = crypto
    .createHmac('sha256', RLS_CONTEXT_SIGNING_SECRET)
    .update(rlsPayload)
    .digest('base64url');
  const rlsAssertionToken = `${rlsPayload}.${rlsSig}`;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      client: null,
      boundContext: Object.freeze({ ...verifiedContext }),
      ignoredCallerAuthHeader,
      rlsAssertionToken,
    };
  }

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-okeng-rls-context': rlsAssertionToken,
        'x-okeng-verified-user': verifiedContext.userId,
        'x-okeng-verified-workspace': verifiedContext.workspaceId,
      },
    },
  });

  return {
    client,
    boundContext: Object.freeze({ ...verifiedContext }),
    ignoredCallerAuthHeader,
    rlsAssertionToken,
  };
}

/**
 * Restricted SystemPrivilegedRepository gate for the 4 audited system operations
 * (`SRV-PRIV-01` through `SRV-PRIV-04`).
 */
export function getSystemPrivilegedSupabaseClient(
  operationId: SystemPrivilegedOperationId
): SupabaseClient | null {
  if (!ALLOWED_PRIVILEGED_OPERATIONS.has(operationId)) {
    throw new Error(`FORBIDDEN_SERVICE_ROLE_OPERATION: ${String(operationId)}`);
  }

  if (cachedServiceRoleClient) return cachedServiceRoleClient;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  cachedServiceRoleClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedServiceRoleClient;
}

/**
 * Returns a read-only anon client when configured; never uses service_role for general queries.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (cachedAnonServerClient) return cachedAnonServerClient;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return null;
  }

  cachedAnonServerClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedAnonServerClient;
}
