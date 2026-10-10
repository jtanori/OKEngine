/**
 * Browser-side direct Supabase table client is disabled (P0-DATA-01 / REPRO-06).
 * All tenant data and retrieval operations must flow through the server-side
 * 5-Link Workspace Authorization Guard and `createUserScopedSupabaseClient()`.
 */
export const BROWSER_DIRECT_SUPABASE_DISABLED = true;

export const getSupabaseBrowserClient: undefined = undefined;
