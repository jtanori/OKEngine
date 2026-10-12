import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getConfiguredOAuthProviders,
  isOAuthProviderConfigured,
} from '../../src/lib/supabase/oauthProviders';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const ENV_KEYS = [
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET',
  'SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID',
  'SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET',
];
const originalEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

function clearProviderEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

afterEach(() => {
  clearProviderEnv();
  for (const [key, value] of originalEnv) {
    if (value !== undefined) process.env[key] = value;
  }
});

describe('OAuth provider configuration and server flow', () => {
  it('advertises only providers with a complete, non-blank credential pair', () => {
    clearProviderEnv();
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = ' google-id ';
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET = ' google-secret ';
    process.env.SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID = 'github-id';

    assert.deepEqual(getConfiguredOAuthProviders(), ['google']);
    assert.equal(isOAuthProviderConfigured('google'), true);
    assert.equal(isOAuthProviderConfigured('github'), false);
    assert.equal(isOAuthProviderConfigured('saml'), false);
    assert.deepEqual(getConfiguredOAuthProviders(), ['google']);
  });

  it('returns no providers when credentials are absent or whitespace-only', () => {
    clearProviderEnv();
    assert.deepEqual(getConfiguredOAuthProviders(), []);
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = '   ';
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET = 'google-secret';
    process.env.SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID = 'github-id';
    process.env.SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET = '   ';
    assert.deepEqual(getConfiguredOAuthProviders(), []);
  });

  it('keeps provider availability output to safe provider identifiers', () => {
    clearProviderEnv();
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = 'must-not-be-returned-id';
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET = 'must-not-be-returned-secret';
    process.env.SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID = 'github-id';
    process.env.SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET = 'github-secret';

    const serialized = JSON.stringify(getConfiguredOAuthProviders());
    assert.equal(serialized, '["google","github"]');
    assert.doesNotMatch(serialized, /must-not-be-returned|github-id|github-secret/);
  });

  it('uses a same-origin, allowlisted, CSRF-protected server OAuth start and callback', () => {
    const providersRoute = read('src/app/api/auth/providers/route.ts');
    const startRoute = read('src/app/api/auth/oauth/start/route.ts');
    const callbackRoute = read('src/app/auth/callback/route.ts');
    const validation = read('src/lib/validation.ts');

    assert.match(providersRoute, /getConfiguredOAuthProviders/);
    assert.match(providersRoute, /Cache-Control/);
    assert.match(providersRoute, /no-store/);
    assert.match(startRoute, /validateCsrf\(request\)/);
    assert.match(startRoute, /rateLimit\(request, 'AUTH'\)/);
    assert.match(startRoute, /isOAuthProviderConfigured/);
    assert.match(startRoute, /auth\.signInWithOAuth/);
    assert.match(startRoute, /rememberSession/);
    assert.match(startRoute, /termsAccepted/);
    assert.match(startRoute, /\/auth\/callback/);
    assert.match(startRoute, /const configuredUrl = process\.env\.NEXT_PUBLIC_APP_URL/);
    assert.match(startRoute, /if \(!configuredUrl\) return null/);
    assert.doesNotMatch(startRoute, /request\.nextUrl\.origin/);
    assert.doesNotMatch(startRoute, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(validation, /oauthStartSchema/);
    assert.match(validation, /z\.enum\(\['google', 'github'\]\)/);
    assert.match(callbackRoute, /exchangeCodeForSession\(code\)/);
    assert.match(callbackRoute, /client\.auth\.getUser\(\)/);
    assert.match(callbackRoute, /provision_initial_workspace/);
    assert.match(callbackRoute, /getSafeNext/);
    assert.match(callbackRoute, /!authData\.user\.email\?\.trim\(\)/);
  });

  it('binds local provider config to server-only env and keeps the requested stack footprint', () => {
    const localConfig = read('supabase/config.toml');
    const localScript = read('scripts/supabase-local.ps1');

    assert.match(localConfig, /\[auth\.external\.google\][\s\S]*?enabled = false/);
    assert.match(localConfig, /\[auth\.external\.github\][\s\S]*?enabled = false/);
    assert.match(localConfig, /redirect_uri = "http:\/\/127\.0\.0\.1:54321\/auth\/v1\/callback"/);
    assert.match(localConfig, /env\(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID\)/);
    assert.match(localConfig, /env\(SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET\)/);
    assert.match(localConfig, /http:\/\/localhost:3000\/auth\/callback/);
    assert.match(localConfig, /\[auth\]\s*[\s\S]*?enabled = true/);
    assert.match(localConfig, /\[storage\]\s*[\s\S]*?enabled = true/);
    assert.match(localConfig, /\[edge_runtime\]\s*enabled = true/);
    assert.match(localConfig, /\[realtime\]\s*enabled = false/);
    assert.match(localConfig, /\[studio\]\s*enabled = false/);
    assert.match(localConfig, /\[local_smtp\]\s*enabled = false/);
    assert.match(localConfig, /\[analytics\]\s*enabled = false/);
    assert.match(localConfig, /\[db\.pooler\]\s*enabled = false/);
    assert.match(localScript, /Import-LocalOAuthEnv/);
    assert.match(localScript, /ReadAllLines\(\$envFile\)/);
    assert.match(localScript, /foreach \(\$name in \$providerEnvNames\)[\s\S]*?SetEnvironmentVariable\(\$name, \$null, 'Process'\)/);
    assert.match(localScript, /Set-LocalOAuthProviderState/);
    assert.match(localScript, /Invoke-LocalSupabaseStart/);
    assert.match(localScript, /'db', 'reset', '--local', '--yes'/);
    assert.match(localScript, /@\('migration', 'up', '--local'\)/);
    assert.doesNotMatch(localScript, /Invoke-Expression/);
  });

  it('keeps provider secrets out of the browser bundle and does not add a browser Supabase client', () => {
    const providerHelper = read('src/lib/supabase/oauthProviders.ts');
    const browserSupabase = read('src/lib/supabase/client.ts');
    const envTemplate = read('.env.example');

    assert.match(providerHelper, /SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET/);
    assert.match(providerHelper, /SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET/);
    assert.doesNotMatch(envTemplate, /NEXT_PUBLIC_SUPABASE_AUTH_EXTERNAL/);
    assert.match(browserSupabase, /BROWSER_DIRECT_SUPABASE_DISABLED = true/);
    assert.doesNotMatch(browserSupabase, /createBrowserClient|createClient\(/);
  });
});
