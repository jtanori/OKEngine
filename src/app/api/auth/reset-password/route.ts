// POST /api/auth/reset-password — Secure token verification, atomic consumption, single transaction (P0 fix PLAN-008 Phase 1)
// Implements: atomic UPDATE ... WHERE used_at IS NULL AND expires_at > NOW() RETURNING user_id, token consumption and password update in single transaction, hash only after validation, concurrent reuse prevention
import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { validateCsrf } from '@/lib/auth';
import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function POST(request: NextRequest) {
  // Operational safeguard: keep OKENG_ENABLE_PASSWORD_RESET=false until full flow verified
  // For Phase 1 implementation, we allow true, but if explicitly false, return 501 and ensure cannot modify passwords
  if (process.env.OKENG_ENABLE_PASSWORD_RESET === 'false') {
    return NextResponse.json(
      { error: 'not_implemented', message: 'Password reset disabled until full flow verified' },
      { status: 501 }
    );
  }

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

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', message: 'Error de validación', details: parsed.error.flatten() }, { status: 422 });
  }

  const { token, newPassword } = parsed.data;

  if (!token) {
    return NextResponse.json({ error: 'bad_request', message: 'Token inválido o expirado' }, { status: 400 });
  }

  // Hash raw token to lookup
  const tokenHash = sha256(token);

  let client: any = null;
  try {
    const pool = getPool();
    client = await pool.connect();

    // Single transaction: token consumption and password update atomically — prevents token consumed without password reset on failure
    await client.query('BEGIN');

    // Atomic consumption: UPDATE ... WHERE used_at IS NULL AND expires_at > NOW() RETURNING user_id
    // Only first concurrent request succeeds, second returns 0 rows → 400
    const consumeRes = await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       RETURNING user_id, id`,
      [tokenHash]
    );

    if (consumeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'bad_request', message: 'Token inválido o expirado' }, { status: 400 });
    }

    const userId = consumeRes.rows[0].user_id;

    // Hash new password only after successful validation — per reviewer, avoid bcrypt waste and DoS
    const hash = await bcrypt.hash(newPassword, 10);

    // Update password
    await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);

    // Invalidate other unused tokens for same user
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);

    await client.query('COMMIT');

    console.log(`[auth/reset-password] Password reset successful for user ${userId}, token ${consumeRes.rows[0].id} consumed`);

    return NextResponse.json({ success: true, message: 'Contraseña restablecida' });
  } catch (err: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('[auth/reset-password] Rollback failed', rbErr);
      }
    }
    console.error('[auth/reset-password] Error', err);
    // If table doesn't exist, return 400 not 500 to avoid leaking, but log
    if (err.message && err.message.includes('password_reset_tokens')) {
      return NextResponse.json({ error: 'bad_request', message: 'Token inválido o expirado' }, { status: 400 });
    }
    return NextResponse.json({ error: 'internal_error', message: 'Error interno' }, { status: 500 });
  } finally {
    if (client) {
      try {
        client.release();
      } catch {}
    }
  }
}
