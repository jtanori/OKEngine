// src/lib/env.ts — Env validation fail-fast for Next.js (SEC-ENV-01)
// Preserves logic from src/services/sessionAndCsrf.ts validateEnv()

export interface EnvConfig {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  CSRF_SECRET: string;
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  REDIS_URL?: string;
  CORS_ALLOWED_ORIGINS?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

let cachedEnv: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const errors: string[] = [];

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) errors.push('DATABASE_URL is required');
  else if (!DATABASE_URL.startsWith('postgresql://') && !DATABASE_URL.startsWith('postgres://')) {
    errors.push('DATABASE_URL must be a valid postgres URL');
  }

  const SESSION_SECRET = process.env.SESSION_SECRET;
  if (!SESSION_SECRET) errors.push('SESSION_SECRET is required');
  else if (SESSION_SECRET.length < 32) errors.push('SESSION_SECRET must be >=32 chars');

  const CSRF_SECRET = process.env.CSRF_SECRET;
  if (!CSRF_SECRET) errors.push('CSRF_SECRET is required');
  else if (CSRF_SECRET.length < 32) errors.push('CSRF_SECRET must be >=32 chars');

  const NODE_ENV = (process.env.NODE_ENV || 'development') as EnvConfig['NODE_ENV'];
  if (!['development', 'production', 'test'].includes(NODE_ENV)) {
    errors.push('NODE_ENV must be development|production|test');
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  if (isNaN(PORT) || PORT < 1 || PORT > 65535) errors.push('PORT must be a valid number 1-65535');

  const REDIS_URL = process.env.REDIS_URL;
  if (REDIS_URL && !REDIS_URL.startsWith('redis://') && !REDIS_URL.startsWith('rediss://')) {
    errors.push('REDIS_URL must be valid redis URL');
  }

  const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS;
  if (CORS_ALLOWED_ORIGINS && CORS_ALLOWED_ORIGINS.includes('*')) {
    errors.push('CORS_ALLOWED_ORIGINS must not contain wildcard * — exact-origin only');
  }

  if (errors.length > 0) {
    const msg = `Env validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`;
    console.error(msg);
    throw new Error(msg);
  }

  cachedEnv = {
    DATABASE_URL: DATABASE_URL!,
    SESSION_SECRET: SESSION_SECRET!,
    CSRF_SECRET: CSRF_SECRET!,
    NODE_ENV,
    PORT,
    REDIS_URL,
    CORS_ALLOWED_ORIGINS,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  };

  console.log(`[env] Validated — NODE_ENV=${NODE_ENV}, PORT=${PORT}, REDIS=${REDIS_URL ? 'present' : 'fallback (in-memory)'}, CORS=${CORS_ALLOWED_ORIGINS || 'default'}`);

  return cachedEnv;
}

// For Next.js build-time validation — call in instrumentation or middleware
export function getEnv(): EnvConfig {
  if (!cachedEnv) {
    try {
      return validateEnv();
    } catch {
      // In build time without env, return dummy for static generation, but fail at runtime
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return {
          DATABASE_URL: 'postgresql://dummy',
          SESSION_SECRET: 'dummy-secret-32-chars-minimum-length',
          CSRF_SECRET: 'dummy-csrf-secret-32-chars-min',
          NODE_ENV: 'production',
          PORT: 3000,
        };
      }
      throw new Error('Env validation failed');
    }
  }
  return cachedEnv;
}
