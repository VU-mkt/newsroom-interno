import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';

export type Challenge = {
  status: 'pending' | 'authenticated';
  accountName?: string;
  accountId?: string;
};

const SESSION_DURATION_MS  = 8 * 60 * 60 * 1000;
const SESSION_DURATION_SEC = 8 * 60 * 60;

export function createSession(email: string, accountId: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('Server misconfiguration');
  const payload = Buffer.from(
    JSON.stringify({ email, accountId, exp: Date.now() + SESSION_DURATION_MS })
  ).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function setSessionCookie(res: NextResponse, session: string): void {
  res.cookies.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SEC,
    path: '/',
  });
}

export function validateSession(cookie: string): { email: string; accountId: string } | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const lastDot = cookie.lastIndexOf('.');
  if (lastDot === -1) return null;
  const payload = cookie.substring(0, lastDot);
  const sig = cookie.substring(lastDot + 1);
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.email || !data.accountId || Date.now() > data.exp) return null;
    return { email: data.email, accountId: data.accountId };
  } catch {
    return null;
  }
}
