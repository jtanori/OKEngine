// POST /api/auth/signup — Signup with rate limiting, CSRF, validation
import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { validateCsrf, createSessionResponse } from '@/lib/auth';
import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, 'AUTH');
  if (!rl.success) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', message: `Demasiados intentos, intenta en ${rl.retryAfter}s`, retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  if (!validateCsrf(request)) {
    return NextResponse.json({ error: 'csrf_invalid', message: 'Invalid CSRF token' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', message: 'Error de validación', details: parsed.error.flatten() }, { status: 422 });
  }

  const { name, email, password } = parsed.data;

  try {
    const pool = getPool();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'conflict', message: 'El correo ya existe' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    await pool.query('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [id, email, passwordHash, name]);

    // Create default workspace for user? For MVP, create workspace with slug from email or name
    const workspaceId = crypto.randomUUID();
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(0, 6)}`;
    const publicKey = crypto.randomBytes(16).toString('hex');
    const signingSecret = crypto.randomBytes(32).toString('hex');

    await pool.query('INSERT INTO workspaces (id, name, slug, public_key, signing_secret, plan, plan_interval, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())', [
      workspaceId,
      `${name}'s Workspace`,
      slug,
      publicKey,
      signingSecret,
      'starter',
      'monthly',
    ]);

    await pool.query('INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at) VALUES ($1, $2, $3, $4, NOW())', [crypto.randomUUID(), workspaceId, id, 'admin']);

    const sessionData = {
      userId: id,
      email,
      role: 'admin' as const,
      workspaceId,
      createdAt: Date.now(),
    };

    return createSessionResponse(sessionData);
  } catch (err: any) {
    console.error('[auth/signup] Error', err);
    return NextResponse.json({ error: 'internal_error', message: 'Error interno' }, { status: 500 });
  }
}
