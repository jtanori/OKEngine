const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function getTomlSection(config, sectionName) {
  const lines = String(config).split(/\r?\n/);
  const header = `[${sectionName}]`;
  const indexes = lines
    .map((line, index) => line.trim() === header ? index : -1)
    .filter((index) => index >= 0);
  if (indexes.length !== 1) return null;

  const values = [];
  for (let index = indexes[0] + 1; index < lines.length; index += 1) {
    if (/^\s*\[[^\]]+\]\s*(?:#.*)?$/.test(lines[index])) break;
    values.push(lines[index]);
  }
  return values.join('\n');
}

function hasUniqueTomlSetting(section, key, expectedLiteral) {
  if (typeof section !== 'string') return false;
  const assignments = section.match(new RegExp(`^\\s*${key}\\s*=`, 'gm')) || [];
  if (assignments.length !== 1) return false;
  return new RegExp(`^\\s*${key}\\s*=\\s*${expectedLiteral}\\s*(?:#.*)?$`, 'm').test(section);
}

/**
 * Refuse to start/reset unless every critical service setting is in its exact
 * TOML section. A loose whole-file regex could accidentally accept a port or
 * `enabled` value copied from a different service section.
 */
export function assertExpectedLocalSupabaseConfig(config) {
  if (typeof config !== 'string') {
    throw new Error('Refusing local Supabase tests: config.toml content is missing. No database operation was performed.');
  }

  const lines = config.split(/\r?\n/);
  const firstSection = lines.findIndex((line) => /^\s*\[[^\]]+\]\s*(?:#.*)?$/.test(line));
  const topLevel = (firstSection < 0 ? lines : lines.slice(0, firstSection)).join('\n');
  const projectAssignments = topLevel.match(/^\s*project_id\s*=/gm) || [];
  if (projectAssignments.length !== 1 || !/^\s*project_id\s*=\s*"okengine-local"\s*(?:#.*)?$/m.test(topLevel)) {
    throw new Error('Refusing local Supabase tests: config.toml must use the unique local project_id "okengine-local". No database operation was performed.');
  }

  const required = [
    ['api', 'enabled', 'true'],
    ['api', 'port', '54321'],
    ['db', 'port', '54322'],
    ['db', 'major_version', '15'],
    ['db.pooler', 'enabled', 'false'],
    ['db.migrations', 'enabled', 'true'],
    ['db.seed', 'enabled', 'false'],
    ['realtime', 'enabled', 'false'],
    ['studio', 'enabled', 'false'],
    ['local_smtp', 'enabled', 'false'],
    ['storage', 'enabled', 'true'],
    ['storage', 'file_size_limit', '"10MiB"'],
    ['storage.s3_protocol', 'enabled', 'false'],
    ['storage.image_transformation', 'enabled', 'false'],
    ['storage.vector', 'enabled', 'false'],
    ['storage.analytics', 'enabled', 'false'],
    ['auth', 'enabled', 'true'],
    ['auth.email', 'enable_confirmations', 'false'],
    ['auth.external.google', 'enabled', 'false'],
    ['auth.external.github', 'enabled', 'false'],
    ['edge_runtime', 'enabled', 'true'],
    ['analytics', 'enabled', 'false'],
  ];

  for (const [sectionName, key, expectedLiteral] of required) {
    if (!hasUniqueTomlSetting(getTomlSection(config, sectionName), key, expectedLiteral)) {
      throw new Error(`Refusing local Supabase tests: [${sectionName}] must set ${key}=${expectedLiteral}. No database operation was performed.`);
    }
  }
  return true;
}

function parseUrl(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Refusing local Supabase tests: ${label} is missing. No database operation was performed.`);
  }

  try {
    return new URL(value);
  } catch {
    throw new Error(`Refusing local Supabase tests: ${label} is not a valid URL. No database operation was performed.`);
  }
}

/**
 * Fail closed unless both service endpoints resolve to the checked-in local
 * Supabase ports on loopback. Error messages intentionally omit supplied URLs
 * because database URLs can contain local passwords.
 */
export function assertLocalSupabaseTarget(
  { apiUrl, databaseUrl },
  { apiPort = 54321, databasePort = 54322 } = {},
) {
  const api = parseUrl(apiUrl, 'SUPABASE_URL');
  const database = parseUrl(databaseUrl, 'DATABASE_URL');

  const apiIsLocal = api.protocol === 'http:'
    && LOOPBACK_HOSTS.has(api.hostname.toLowerCase())
    && api.port === String(apiPort)
    && !api.username
    && !api.password
    && !api.search
    && !api.hash
    && (api.pathname === '' || api.pathname === '/');
  if (!apiIsLocal) {
    throw new Error(`Refusing local Supabase tests: the Auth/API URL must be plain HTTP loopback on port ${apiPort}. No database operation was performed.`);
  }

  const databaseIsLocal = ['postgres:', 'postgresql:'].includes(database.protocol)
    && LOOPBACK_HOSTS.has(database.hostname.toLowerCase())
    && database.port === String(databasePort)
    && database.pathname.replace(/\/$/, '') === '/postgres'
    && !database.search
    && !database.hash;
  if (!databaseIsLocal) {
    throw new Error(`Refusing local Supabase tests: DATABASE_URL must target the loopback PostgreSQL service on port ${databasePort}, database postgres. No database operation was performed.`);
  }

  return true;
}
