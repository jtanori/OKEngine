import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertExpectedLocalSupabaseConfig,
  assertLocalSupabaseTarget,
} from '../../scripts/lib/local-supabase-guard.mjs';

const localConfig = readFileSync(new URL('../../supabase/config.toml', import.meta.url), 'utf8');

const localTarget = {
  apiUrl: 'http://127.0.0.1:54321',
  databaseUrl: 'postgresql://postgres:local-secret@127.0.0.1:54322/postgres',
};

describe('local Supabase destructive-test target guard', () => {
  it('accepts only loopback Auth/API and PostgreSQL endpoints on the configured local ports', () => {
    assert.equal(assertLocalSupabaseTarget(localTarget), true);
    assert.equal(assertLocalSupabaseTarget({
      apiUrl: 'http://localhost:54321',
      databaseUrl: 'postgres://postgres:local-secret@[::1]:54322/postgres',
    }), true);
  });

  it('rejects hosted API/database endpoints and never includes credentials in its error', () => {
    assert.throws(
      () => assertLocalSupabaseTarget({
        apiUrl: 'https://project-ref.supabase.co',
        databaseUrl: 'postgresql://postgres:do-not-print@db.project-ref.supabase.co:5432/postgres',
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /loopback|local/i);
        assert.doesNotMatch(error.message, /do-not-print|project-ref/);
        return true;
      },
    );
  });

  it('rejects non-loopback ports, HTTPS proxies, URL credentials, and unexpected database names', () => {
    const cases = [
      { apiUrl: 'http://127.0.0.1:54322', databaseUrl: localTarget.databaseUrl },
      { apiUrl: 'https://127.0.0.1:54321', databaseUrl: localTarget.databaseUrl },
      { apiUrl: 'http://user:pass@127.0.0.1:54321', databaseUrl: localTarget.databaseUrl },
      { apiUrl: localTarget.apiUrl, databaseUrl: 'postgresql://postgres:secret@127.0.0.1:5432/postgres' },
      { apiUrl: localTarget.apiUrl, databaseUrl: 'postgresql://postgres:secret@127.0.0.1:54322/production' },
      { apiUrl: localTarget.apiUrl, databaseUrl: 'postgresql://postgres:secret@127.0.0.1:54322/postgres?host=db.project-ref.supabase.co' },
    ];
    for (const candidate of cases) assert.throws(() => assertLocalSupabaseTarget(candidate));
  });
});

describe('checked-in local Supabase config guard', () => {
  it('accepts only the intended API/Auth/PostgreSQL/Storage/Edge footprint and safe provider defaults', () => {
    assert.equal(assertExpectedLocalSupabaseConfig(localConfig), true);
  });

  it('rejects a port value borrowed from a different section instead of validating the API section', () => {
    const deceptiveConfig = localConfig
      .replace('port = 54321', 'port = 54399')
      .replace('[realtime]\nenabled = false', '[realtime]\nenabled = false\nport = 54321');
    assert.throws(() => assertExpectedLocalSupabaseConfig(deceptiveConfig), /api.*54321/i);
  });

  it('rejects enabled optional services and email confirmations in the baseline stack', () => {
    const withStudioEnabled = localConfig.replace('[studio]\nenabled = false', '[studio]\nenabled = true');
    const withEmailConfirmations = localConfig.replace('enable_confirmations = false', 'enable_confirmations = true');
    assert.throws(() => assertExpectedLocalSupabaseConfig(withStudioEnabled), /studio/i);
    assert.throws(() => assertExpectedLocalSupabaseConfig(withEmailConfirmations), /confirmations/i);
  });
});
