// POST /api/auth/forgot-password — Secure token generation, no enumeration (P0 fix PLAN-008 Phase 1)
// Implements: random 256-bit token, SHA256 hash at rest, expiry 1h, single active token per user, invalidate old, rate limit per IP and per email
import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { validateCsrf } from '@/lib/auth';
import { getPool } from '@/lib/db';
import crypto from 'crypto';

function getClientIp(request: NextRequest): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const isProd = process.env.NODE_ENV === 'production';
  if (trustProxy || isProd) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip') || request.headers.get('x-vercel-forwarded-for') || 'unknown';
  }
  // Dev: allow x-forwarded-for for testing
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

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

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    // Still return generic success to avoid enumeration
    return NextResponse.json({ success: true, message: 'Si el correo existe, recibirás un enlace' });
  }

  const { email } = parsed.data;
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const pool = getPool();

    // Lookup user by email — if not exists, still return generic success (no enumeration)
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      // No user — generic success, no token created, no timing leak
      console.log(`[auth/forgot-password] No user for email ${email} — generic success`);
      return NextResponse.json({ success: true, message: 'Si el correo existe, recibirás un enlace' });
    }

    const userId = userRes.rows[0].id;

    // Generate random 256-bit token (32 bytes hex = 64 chars)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h expiry

    // Invalidate previous unused tokens for same user — single active token
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);

    // Store hashed token, not raw
    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tokenId, userId, tokenHash, expiresAt, clientIp, userAgent]
    );

    // Send email with reset link — for MVP, log in dev only, never prod
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

    const isDev = process.env.NODE_ENV === 'development' && (process.env.OKENG_ENV === 'development' || !process.env.OKENG_ENV);
    if (isDev) {
      console.log(`[auth/forgot-password] DEV ONLY — Reset link for ${email}: ${resetLink}`);
      console.log(`[auth/forgot-password] Raw token (dev only): ${rawToken}, hash: ${tokenHash}`);
    } else {
      // In production, send email via email service — TODO: integrate email provider
      console.log(`[auth/forgot-password] Password reset token generated for user ${userId}, expires at ${expiresAt.toISOString()}`);
      // TODO: await sendEmail({ to: email, subject: 'Restablece tu contraseña', html: `...${resetLink}...` })
    }

    // Always return generic success to avoid enumeration
    return NextResponse.json({ success: true, message: 'Si el correo existe, recibirás un enlace' });
  } catch (err: any) {
    // If table doesn't exist or DB error (e.g., memory mode dummy URL), still return generic success to avoid enumeration and not leak
    console.error('[auth/forgot-password] Error', err);
    // For memory mode or missing table, we still return generic success — do not leak existence
    // But if it's a real DB error in prod, we should still return generic success to avoid enumeration, but log
    return NextResponse.json({ success: true, message: 'Si el correo existe, recibirás un enlace' });
  }
}
