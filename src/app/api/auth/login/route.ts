// POST /api/auth/login — Login with rate limiting TIER_AUTH_5_PER_15M, CSRF, validation, session regeneration
import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { validateCsrf, createSessionResponse } from '@/lib/auth';
import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  // Rate limiting AUTH
  const rl = await rateLimit(request, 'AUTH');
  if (!rl.success) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', message: `Demasiados intentos, intenta en ${rl.retryAfter}s`, retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  // CSRF
  if (!validateCsrf(request)) {
    return NextResponse.json({ error: 'csrf_invalid', message: 'Invalid CSRF token' }, { status: 403 });
  }

  // Validation
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', message: 'Error de validación', details: parsed.error.flatten() }, { status: 422 });
  }

  const { email, password } = parsed.data;

  try {
    const pool = getPool();
    const res = await pool.query('SELECT id, email, password_hash, name, role FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      // Generic 401, no enumeration
      return NextResponse.json({ error: 'unauthorized', message: 'Credenciales inválidas' }, { status: 401 });
    }

    const user = res.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'unauthorized', message: 'Credenciales inválidas' }, { status: 401 });
    }

    // Session creation with regeneration
    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role || 'member',
      createdAt: Date.now(),
    };

    const response = createSessionResponse(sessionData);
    return response;
  } catch (err: any) {
    console.error('[auth/login] Error', err);
    return NextResponse.json({ error: 'internal_error', message: 'Error interno' }, { status: 500 });
  }
}
