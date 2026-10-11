// POST /api/auth/logout — Destroy session
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({ success: true });
  response.cookies.set(isProd ? '__Host-okeng.sid' : 'okeng.sid', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set(isProd ? '__Host-okeng.csrf' : 'okeng.csrf', '', {
    httpOnly: false,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
