import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertExpectedLocalSupabaseConfig,
  assertLocalSupabaseTarget,
  enableLocalEmailConfirmationsForTest,
} from '../../scripts/lib/local-supabase-guard.mjs';

const localConfig = readFileSync(new URL('../../supabase/config.toml', import.meta.url), 'utf8');

const localTarget = {
  apiUrl: 'http://127.0.0.1:54321',
  databaseUrl: 'postgresql://127.0.0.1:54322/postgres',
};

describe('local Supabase destructive-test target guard', () => {
  it('accepts only loopback Auth/API and PostgreSQL endpoints on the configured local ports', () => {
    assert.equal(assertLocalSupabaseTarget(localTarget), true);
    assert.equal(assertLocalSupabaseTarget({
      apiUrl: 'http://localhost:54321',
      databaseUrl: 'postgres://[::1]:54322/postgres',
    }), true);
  });

  it('rejects hosted API/database endpoints and never includes credentials in its error', () => {
    const passwordMarker = `fixture-${randomUUID()}`;
    const hostedDatabaseUrl = new URL('postgresql://db.project-ref.supabase.co:5432/postgres');
    hostedDatabaseUrl.username = 'fixture-user';
    hostedDatabaseUrl.password = passwordMarker;

    assert.throws(
      () => assertLocalSupabaseTarget({
        apiUrl: localTarget.apiUrl,
        databaseUrl: hostedDatabaseUrl.toString(),
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /loopback|local/i);
        assert.doesNotMatch(error.message, new RegExp(passwordMarker));
        assert.doesNotMatch(error.message, /project-ref/);
        return true;
      },
    );
    assert.throws(() => assertLocalSupabaseTarget({
      apiUrl: 'https://project-ref.supabase.co',
      databaseUrl: localTarget.databaseUrl,
    }));
  });

  it('rejects non-loopback ports, HTTPS proxies, URL credentials, and unexpected database names', () => {
    const credentialedApi = new URL(localTarget.apiUrl);
    credentialedApi.username = 'fixture-user';
    credentialedApi.password = 'fixture-password';
    const cases = [
      { apiUrl: 'http://127.0.0.1:54322', databaseUrl: localTarget.databaseUrl },
      { apiUrl: 'https://127.0.0.1:54321', databaseUrl: localTarget.databaseUrl },
      { apiUrl: credentialedApi.toString(), databaseUrl: localTarget.databaseUrl },
      { apiUrl: localTarget.apiUrl, databaseUrl: 'postgresql://127.0.0.1:5432/postgres' },
      { apiUrl: localTarget.apiUrl, databaseUrl: 'postgresql://127.0.0.1:54322/production' },
      { apiUrl: localTarget.apiUrl, databaseUrl: 'postgresql://127.0.0.1:54322/postgres?host=db.project-ref.supabase.co' },
    ];
    for (const candidate of cases) assert.throws(() => assertLocalSupabaseTarget(candidate));
  });
});

describe('checked-in local Supabase config guard', () => {
  it('accepts only the intended API/Auth/PostgreSQL/Storage/Edge footprint and safe provider defaults', () => {
    assert.equal(assertExpectedLocalSupabaseConfig(localConfig), true);
  });

  it('rejects a port value borrowed from a different section instead of validating the API section', () => {
    const lineEnding = localConfig.includes('\r\n') ? '\r\n' : '\n';
    const deceptiveConfig = localConfig
      .replace('port = 54321', 'port = 54399')
      .replace(/(\[realtime\]\r?\nenabled = false)/, `$1${lineEnding}port = 54321`);
    assert.match(deceptiveConfig, new RegExp(`\\[realtime\\]${lineEnding === '\r\n' ? '\\r?\\n' : '\\n'}enabled = false${lineEnding === '\r\n' ? '\\r?\\n' : '\\n'}port = 54321`));
    assert.throws(() => assertExpectedLocalSupabaseConfig(deceptiveConfig), /api.*54321/i);
  });

  it('rejects enabled optional services in the baseline and scopes the test confirmation override to Auth email', () => {
    // Exercise Windows checkouts explicitly: Git may materialize config.toml as CRLF.
    const windowsConfig = localConfig.replace(/\r?\n/g, '\r\n');
    const withStudioEnabled = windowsConfig.replace(
      /^(\[studio\]\r?\nenabled = )false(\r?)$/m,
      '$1true$2',
    );
    const withEmailConfirmations = windowsConfig.replace('enable_confirmations = false', 'enable_confirmations = true');
    assert.notEqual(withStudioEnabled, windowsConfig, 'The CRLF fixture must actually enable Studio.');
    assert.throws(() => assertExpectedLocalSupabaseConfig(withStudioEnabled), /studio/i);
    assert.throws(() => assertExpectedLocalSupabaseConfig(withEmailConfirmations), /confirmations/i);

    const testConfig = enableLocalEmailConfirmationsForTest(windowsConfig);
    assert.match(testConfig, /\[auth\.email\][\s\S]*?enable_confirmations = true/);
    assert.match(testConfig, /\[local_smtp\]\r?\nenabled = false/);
    assert.ok(testConfig.includes('\r\n'));
    assert.equal(testConfig.replace(/\r\n/g, '').includes('\n'), false, 'The test-only override should preserve Windows line endings.');
    assert.throws(() => assertExpectedLocalSupabaseConfig(testConfig), /confirmations/i);
    assert.throws(
      () => enableLocalEmailConfirmationsForTest(windowsConfig.replace('[auth.email]', '[auth.email]\r\nenable_confirmations = false')),
      /exactly (?:one|once)|unique/i,
    );
  });
});
