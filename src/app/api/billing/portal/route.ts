// POST /api/billing/portal — Create Stripe Customer Portal Session
import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSystemRole } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, 'WRITE');
  if (!rl.success) return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 });

  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    requireSystemRole(session.role, 'admin');
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json({ url: '/settings/billing', message: 'Billing portal placeholder' });
}
