// POST /api/billing/checkout — Create Stripe Checkout Session (from ANALYSIS-001)
import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireSystemRole } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, 'WRITE');
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limit_exceeded', message: 'Too many requests', retryAfter: rl.retryAfter }, { status: 429 });
  }

  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'unauthorized', message: 'No autorizado' }, { status: 401 });

  try {
    requireSystemRole(session.role, 'admin');
  } catch {
    return NextResponse.json({ error: 'forbidden', message: 'No tienes permiso' }, { status: 403 });
  }

  // TODO: Implement Stripe checkout session creation
  // For MVP, return placeholder URL
  return NextResponse.json({ url: '/#precios', message: 'Billing checkout placeholder — implement Stripe' });
}
