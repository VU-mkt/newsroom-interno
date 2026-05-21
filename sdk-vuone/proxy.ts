import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/session';

// /flamengo covers the whole prefix (/flamengo/home included) — standalone demo with its own auth flow
const PUBLIC_PATHS = ['/login', '/flamengo', '/enroll', '/qr', '/api/auth', '/api/user', '/_next', '/favicon.ico'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  console.log('[proxy]', pathname);

  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) {
    console.log('[proxy] no session cookie, redirecting');
    return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(pathname)}`, req.url));
  }

  const session = validateSession(sessionCookie);
  if (!session) {
    console.log('[proxy] session invalid or expired, redirecting');
    return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(pathname)}`, req.url));
  }

  console.log('[proxy] session ok for', session.email);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif)$).*)'],
};
