// POST /api/auth/signup — Secure atomic signup with transaction, slug collision handling (P1 fix PLAN-008 Phase 4)
// Implements: BEGIN/COMMIT/ROLLBACK atomic transaction for user + workspace + membership, handle slug collision, scoped

import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { validateCsrf, createSessionResponse } from '@/lib/auth';
import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function generateSlug(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'workspace';
  return `${base}-${suffix}`;
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

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', message: 'Error de validación', details: parsed.error.flatten() }, { status: 422 });
  }

  const { name, email, password } = parsed.data;

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'conflict', message: 'El correo ya existe' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await client.query('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [
      userId,
      email,
      passwordHash,
      name,
    ]);

    // Create default workspace for user with slug collision handling
    const workspaceId = crypto.randomUUID();
    const publicKey = crypto.randomBytes(16).toString('hex');
    const signingSecret = crypto.randomBytes(32).toString('hex');
    const signingSecretHash = crypto.createHash('sha256').update(signingSecret).digest('hex');

    let slug = generateSlug(name, userId.slice(0, 6));
    let workspaceInserted = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!workspaceInserted && attempts < maxAttempts) {
      attempts++;
      try {
        // Try canonical schema with signing_secret_hash and billing columns (Phase 3)
        await client.query(
          `INSERT INTO workspaces (id, name, slug, public_key, signing_secret_hash, plan, plan_interval, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [workspaceId, `${name}'s Workspace`, slug, publicKey, signingSecretHash, 'starter', 'monthly']
        );
        workspaceInserted = true;
      } catch (err: any) {
        const msg = err.message || '';
        // Slug collision — unique violation on slug
        if (msg.includes('duplicate key') && msg.includes('slug')) {
          if (attempts < maxAttempts) {
            slug = generateSlug(name, crypto.randomBytes(3).toString('hex'));
            console.warn(`[auth/signup] Slug collision ${slug}, retrying attempt ${attempts + 1}`);
            continue;
          } else {
            throw err;
          }
        }
        // If columns like plan, signing_secret_hash don't exist (e.g., memory mode or old schema), try fallback
        if (msg.includes('signing_secret_hash') || msg.includes('plan') || msg.includes('column')) {
          try {
            // Fallback 1: try with signing_secret (legacy)
            await client.query(
              `INSERT INTO workspaces (id, name, slug, public_key, signing_secret, plan, plan_interval, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
              [workspaceId, `${name}'s Workspace`, slug, publicKey, signingSecret, 'starter', 'monthly']
            );
            workspaceInserted = true;
          } catch (err2: any) {
            const msg2 = err2.message || '';
            if (msg2.includes('duplicate key') && msg2.includes('slug') && attempts < maxAttempts) {
              slug = generateSlug(name, crypto.randomBytes(3).toString('hex'));
              continue;
            }
            if (msg2.includes('plan') || msg2.includes('signing_secret')) {
              try {
                // Fallback 2: minimal columns (base schema only)
                await client.query(
                  `INSERT INTO workspaces (id, name, slug, public_key, signing_secret_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                  [workspaceId, `${name}'s Workspace`, slug, publicKey, signingSecretHash]
                );
                workspaceInserted = true;
              } catch (err3: any) {
                const msg3 = err3.message || '';
                if (msg3.includes('duplicate key') && msg3.includes('slug') && attempts < maxAttempts) {
                  slug = generateSlug(name, crypto.randomBytes(3).toString('hex'));
                  continue;
                }
                // Final fallback: try with signing_secret only
                await client.query(
                  `INSERT INTO workspaces (id, name, slug, public_key, signing_secret, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                  [workspaceId, `${name}'s Workspace`, slug, publicKey, signingSecret]
                );
                workspaceInserted = true;
              }
            } else {
              throw err2;
            }
          }
        } else {
          throw err;
        }
      }
    }

    if (!workspaceInserted) {
      throw new Error('Failed to insert workspace after retries');
    }

    // Insert membership — try new table workspace_memberships and legacy workspace_members for compatibility
    // Both should be in same transaction for atomicity
    const membershipId = crypto.randomUUID();
    let membershipInserted = false;

    try {
      // Try new canonical table first
      await client.query(
        `INSERT INTO workspace_memberships (id, workspace_id, user_id, role, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [membershipId, workspaceId, userId, 'WORKSPACE_OWNER', 'ACTIVE']
      );
      membershipInserted = true;
    } catch (err: any) {
      console.warn('[auth/signup] workspace_memberships insert failed, trying legacy workspace_members', err.message);
    }

    try {
      // Also insert into legacy workspace_members for backward compatibility if table exists
      await client.query('INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at) VALUES ($1, $2, $3, $4, NOW())', [
        crypto.randomUUID(),
        workspaceId,
        userId,
        'admin',
      ]);
      membershipInserted = true;
    } catch (err: any) {
      console.warn('[auth/signup] workspace_members insert failed', err.message);
      // If legacy fails but new succeeded, still okay
      // If both fail, we should rollback
      if (!membershipInserted) {
        throw err;
      }
    }

    if (!membershipInserted) {
      throw new Error('Failed to insert membership');
    }

    await client.query('COMMIT');

    const sessionData = {
      userId,
      email,
      role: 'admin' as const,
      workspaceId,
      workspaceRole: 'WORKSPACE_OWNER',
      createdAt: Date.now(),
    };

    return createSessionResponse(sessionData);
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('[auth/signup] Rollback failed', rbErr);
    }
    console.error('[auth/signup] Error', err);
    // Handle slug collision after retries
    if (err.message && err.message.includes('duplicate key') && err.message.includes('slug')) {
      return NextResponse.json({ error: 'conflict', message: 'Slug already exists, try different name' }, { status: 409 });
    }
    return NextResponse.json({ error: 'internal_error', message: 'Error interno' }, { status: 500 });
  } finally {
    client.release();
  }
}
