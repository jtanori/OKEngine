// ============================================================================
// DATA-MIG-001: Browser-Safe Supabase Client (Anon Key Only — SECURITY-004)
// Used for OKEng Dashboard user authentication (Flow 1).
// Never contains service-role credentials or signing secrets.
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    '';
  const anonKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    '';

  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey);
  }
  return browserClient;
}
