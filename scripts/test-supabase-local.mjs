import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  assertExpectedLocalSupabaseConfig,
  assertLocalSupabaseTarget,
  enableLocalEmailConfirmationsForTest,
} from './lib/local-supabase-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'supabase', 'config.toml');
const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const isWindows = process.platform === 'win32';
const testFiles = [
  'tests/integration/supabase-schema.live.test.ts',
  'tests/integration/auth-lifecycle.live.test.ts',
  'tests/integration/session-refresh.live.test.ts',
  'tests/integration/supabase-local.e2e.test.ts',
  'tests/integration/private-storage.live.test.ts',
  'tests/integration/oauth-local.live.test.ts',
];

function assertLocalHarnessReady() {
  if (!existsSync(tsxCli)) {
    throw new Error('Node dependencies are missing. Run `npm ci` from the repository root before starting or resetting the local database.');
  }
  const missingSuites = testFiles.filter((file) => !existsSync(path.join(root, file)));
  if (missingSuites.length > 0) {
    throw new Error(`Local integration suite files are missing: ${missingSuites.join(', ')}. No local stack or database reset was started.`);
  }
}

function redact(text = '') {
  return String(text)
    .replace(/\b(ANON_KEY|SERVICE_ROLE_KEY|SECRET_KEY|PUBLISHABLE_KEY|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|DB_URL|DATABASE_URL)\s*=\s*[^\s,]+/gi, '$1=[redacted]')
    .replace(/^(\s*(?:anon key|service_role key|secret key|publishable key|db url|database url|password)\s*:\s*).*$/gim, '$1[redacted]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~-]{20,}/gi, '$1[redacted]');
}

function run(command, args, { env = process.env, capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    encoding: 'utf8',
    windowsHide: true,
    shell: isWindows,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`${command} could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).map(redact).join('\n').trim();
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status ?? 'unknown'}${details ? `:\n${details}` : '.'}`);
  }
  return capture ? String(result.stdout || '') : '';
}

function assertExpectedLocalConfig() {
  if (!existsSync(configPath)) throw new Error('supabase/config.toml is missing; run this command from the OKEngine repository.');
  assertExpectedLocalSupabaseConfig(readFileSync(configPath, 'utf8'));
}

function stopExistingLocalStackIfRunning() {
  const status = spawnSync('supabase', ['status', '-o', 'env'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    shell: isWindows,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (status.error) throw new Error(`supabase status could not start: ${status.error.message}`);
  if (status.status === 0) {
    printCaptured(run('supabase', ['stop'], { capture: true }));
  }
}

function startLocalStackWithEmailConfirmation() {
  const checkedInConfig = readFileSync(configPath, 'utf8');
  const testConfig = enableLocalEmailConfirmationsForTest(checkedInConfig);
  try {
    writeFileSync(configPath, testConfig, 'utf8');
    return run('supabase', ['start'], { capture: true });
  } finally {
    // Restore the checked-in development defaults even if the CLI fails.
    writeFileSync(configPath, checkedInConfig, 'utf8');
  }
}

function restoreLocalStackDefaults() {
  stopExistingLocalStackIfRunning();
  printCaptured(run('supabase', ['start'], { capture: true }));
}

function requireExecutable(name, installHint) {
  const result = spawnSync(name, ['--version'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    shell: isWindows,
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${name} was not found or is not usable. ${installHint}`);
  }
}

function parseEnvironment(output) {
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function requiredValue(values, ...names) {
  for (const name of names) {
    if (values[name]?.trim()) return values[name].trim();
  }
  throw new Error(`supabase status did not provide a usable local ${names.join(' or ')} value. Check the local stack and CLI version.`);
}

function makeTestEnvironment(statusValues) {
  const apiUrl = requiredValue(statusValues, 'API_URL');
  const databaseUrl = requiredValue(statusValues, 'DB_URL');
  const anonKey = requiredValue(statusValues, 'ANON_KEY', 'PUBLISHABLE_KEY');
  const serviceRoleKey = requiredValue(statusValues, 'SERVICE_ROLE_KEY', 'SECRET_KEY');
  assertLocalSupabaseTarget({ apiUrl, databaseUrl });

  const randomSecret = () => randomBytes(32).toString('base64url');
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    OKENG_ENV: 'development',
    OKENG_DATA_MODE: 'supabase',
    OKENG_RUN_SUPABASE_INTEGRATION: '1',
    OKENG_LOCAL_SUPABASE_RUNNER: '1',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    OKENG_ALLOWED_ORIGINS: 'http://localhost:3000',
    CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
    OKENG_ENABLE_PASSWORD_RESET: 'true',
    PORT: '3000',
    DATABASE_URL: databaseUrl,
    SUPABASE_URL: apiUrl,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    SESSION_SECRET: randomSecret(),
    CSRF_SECRET: randomSecret(),
  };
  delete env.REDIS_URL;
  delete env.VITE_SUPABASE_URL;
  delete env.VITE_SUPABASE_ANON_KEY;
  for (const key of [
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET',
    'SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID',
    'SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET',
  ]) delete env[key];
  return env;
}

function printCaptured(output) {
  if (output.trim()) console.log(redact(output).trim());
}

let integrationTestsLaunched = false;

async function main() {
  console.log('Local Supabase test harness: checking prerequisites and local-only target.');
  assertExpectedLocalConfig();
  assertLocalHarnessReady();
  requireExecutable('docker', 'Install Docker Desktop for Windows, enable the WSL 2/Linux engine, start it, then retry.');
  requireExecutable('supabase', 'Install the Supabase CLI (`supabase --version` must work in PowerShell), then retry.');
  run('docker', ['info', '--format', '{{.ServerVersion}}']);
  stopExistingLocalStackIfRunning();

  let suiteStatus = 0;
  let testStackStarted = false;
  try {
    console.log('Starting the configured local stack (Auth, PostgreSQL, Storage, and required API gateway/PostgREST).');
    console.log('The runner temporarily enables Auth email confirmation; no SMTP container or provider credentials are used.');
    const startOutput = startLocalStackWithEmailConfirmation();
    testStackStarted = true;
    printCaptured(startOutput);

    const status = parseEnvironment(run('supabase', ['status', '-o', 'env'], { capture: true }));
    const env = makeTestEnvironment(status);

    console.log('Destructively resetting only the validated loopback project with --local; all local database rows will be erased.');
    const resetOutput = run('supabase', ['db', 'reset', '--local', '--yes', '--no-seed'], { capture: true });
    printCaptured(resetOutput);

    console.log('Running clean-schema, confirmed Auth/session, tenant-RLS, and private-Storage runtime tests.');
    integrationTestsLaunched = true;
    const child = spawnSync(process.execPath, [tsxCli, '--test', ...testFiles], {
      cwd: root,
      env,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
    printCaptured(child.stdout || '');
    if (child.stderr) console.error(redact(child.stderr).trim());
    if (child.error) throw new Error(`Live integration test runner failed to start: ${child.error.message}`);
    suiteStatus = child.status ?? 1;
  } finally {
    if (testStackStarted) {
      console.log('Restarting the local stack with the checked-in Auth defaults.');
      restoreLocalStackDefaults();
    } else {
      console.warn('Local Supabase startup did not complete. config.toml was restored; no automatic second start will be attempted. Inspect the CLI health-check output. An unhealthy start may prune this project\'s local Docker volumes.');
    }
  }

  if (suiteStatus === 0) {
    console.log('\n[PASSED] All clean-local Supabase runtime tests completed. The stack remains running with the checked-in local Auth defaults.');
  } else {
    console.error('\n[FAILED] Local Supabase runtime tests failed. The database remains available for diagnosis; rerun the documented command for a clean reset.');
    process.exitCode = suiteStatus;
  }
}

main().catch((error) => {
  const message = redact(error instanceof Error ? error.message : String(error));
  const label = integrationTestsLaunched ? 'FAILED' : 'NOT RUN';
  const status = integrationTestsLaunched ? 1 : 2;
  console.error(`\n[${label}] Local Supabase runtime suite ${integrationTestsLaunched ? 'failed' : 'did not execute'}.\nReason: ${message}\nNext: follow the relevant Windows prerequisite in docs/LOCAL-SUPABASE-WINDOWS.md, resolve this error, then rerun "npm run test:auth-local". The runner only targets the checked-in loopback local ports and never uses a linked/hosted database.`);
  process.exitCode = status;
});
