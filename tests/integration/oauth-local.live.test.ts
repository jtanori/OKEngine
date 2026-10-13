import assert from 'node:assert/strict';
import { GET as providersRoute } from '../../src/app/api/auth/providers/route';
import { POST as oauthStartRoute } from '../../src/app/api/auth/oauth/start/route';
import { test } from 'node:test';
import { makeApiRequest, requireLocalSupabase } from './helpers/localSupabase';

requireLocalSupabase();

test('local OAuth is inert without provider credentials and never attempts an unconfigured Auth flow', async () => {
  for (const key of [
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET',
    'SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID',
    'SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET',
  ]) {
    assert.equal(process.env[key], undefined, 'The baseline local OAuth suite must not inherit provider credentials.');
  }

  const providers = await providersRoute();
  assert.equal(providers.status, 200);
  assert.deepEqual(await providers.json(), { providers: [] });
  assert.match(providers.headers.get('cache-control') || '', /no-store/);

  const missingProvider = await oauthStartRoute(makeApiRequest('/api/auth/oauth/start', {
    method: 'POST',
    csrf: true,
    body: { provider: 'google', remember: false, termsAccepted: true },
  }));
  assert.equal(missingProvider.status, 404);
  assert.equal((await missingProvider.json()).error, 'provider_unavailable');
  assert.equal(missingProvider.cookies.getAll().some(({ name }) => name.startsWith('okeng-auth')), false);

  const noConsent = await oauthStartRoute(makeApiRequest('/api/auth/oauth/start', {
    method: 'POST',
    csrf: true,
    body: { provider: 'github', remember: false, termsAccepted: false },
  }));
  assert.equal(noConsent.status, 422);
  assert.equal((await noConsent.json()).error, 'terms_required');
});
