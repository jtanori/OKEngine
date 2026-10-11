export const OAUTH_PROVIDERS = ['google', 'github'] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
type EnvSource = Record<string, string | undefined>;

type OAuthProviderEnvironment = {
  clientId: string;
  secret: string;
};

const PROVIDER_ENV: Record<OAuthProvider, OAuthProviderEnvironment> = {
  google: {
    clientId: 'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
    secret: 'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET',
  },
  github: {
    clientId: 'SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID',
    secret: 'SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET',
  },
};

export function isOAuthProvider(provider: unknown): provider is OAuthProvider {
  return typeof provider === 'string' && OAUTH_PROVIDERS.includes(provider as OAuthProvider);
}

/** Return true only for allow-listed providers with both non-blank credentials. */
export function isOAuthProviderConfigured(
  provider: unknown,
  env: EnvSource = process.env,
): provider is OAuthProvider {
  if (!isOAuthProvider(provider)) return false;
  const keys = PROVIDER_ENV[provider];
  return Boolean(env[keys.clientId]?.trim() && env[keys.secret]?.trim());
}

/** Safe server-side projection; callers may serialize these identifiers only. */
export function getConfiguredOAuthProviders(env: EnvSource = process.env): OAuthProvider[] {
  return OAUTH_PROVIDERS.filter((provider) => isOAuthProviderConfigured(provider, env));
}
