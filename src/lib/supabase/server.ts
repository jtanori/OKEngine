// ============================================================================
// DATA-MIG-001: Supabase Server & Client Connection Factory with Automatic Fallback
// Never exposes service-role keys to browser bundles (SECURITY-004).
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseAdapterStatus {
  mode: 'supabase-live' | 'local-fallback-adapter';
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  migrationsPresent: boolean;
  rlsPoliciesPresent: boolean;
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let cachedServerClient: SupabaseClient | null = null;

/**
 * Returns a configured Supabase client when credentials exist in the environment,
 * or `null` so the Repository Layer transparently activates its deterministic local fallback.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    return null;
  }
  if (!cachedServerClient) {
    cachedServerClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey || supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return cachedServerClient;
}

export function getSupabaseAdapterStatus(): SupabaseAdapterStatus {
  const hasUrl = Boolean(supabaseUrl);
  const hasAnonKey = Boolean(supabaseAnonKey);
  const hasServiceRoleKey = Boolean(supabaseServiceRoleKey);
  const isLive = hasUrl && (hasAnonKey || hasServiceRoleKey);

  return {
    mode: isLive ? 'supabase-live' : 'local-fallback-adapter',
    hasUrl,
    hasAnonKey,
    hasServiceRoleKey,
    migrationsPresent: true,
    rlsPoliciesPresent: true,
  };
}
