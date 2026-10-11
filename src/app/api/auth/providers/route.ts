import { NextResponse } from 'next/server';
import { getConfiguredOAuthProviders } from '@/lib/supabase/oauthProviders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const response = NextResponse.json({ providers: getConfiguredOAuthProviders() });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
