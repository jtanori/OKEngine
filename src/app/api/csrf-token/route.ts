// GET /api/csrf-token — Returns CSRF token and sets cookie (SEC-CSRF-01)
import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/auth';

export async function GET() {
  const token = generateCsrfToken();
  const isProd = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ csrfToken: token });
  response.cookies.set(isProd ? '__Host-okeng.csrf' : 'okeng.csrf', token, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 60 * 60, // 1h
    path: '/',
  });

  return response;
}
