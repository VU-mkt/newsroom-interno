import { NextRequest, NextResponse } from 'next/server';
import { fetchToken } from '@/lib/vuone';

function decodeSession(cookie: string): { email: string; accountId: string } | null {
  try {
    const lastDot = cookie.lastIndexOf('.');
    if (lastDot === -1) return null;
    const payload = cookie.substring(0, lastDot);
    const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (!data.email || !data.accountId) return null;
    return { email: data.email, accountId: data.accountId };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = decodeSession(sessionCookie);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const token = await fetchToken();
    const baseUrl = process.env.VUONE_BASE_URL!;
    const res = await fetch(`${baseUrl}/api/v1/accounts/${session.accountId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ email: session.email, accountType: null });
    }

    const account = await res.json();
    return NextResponse.json({
      email: session.email,
      accountType: account.accountType ?? null,
    });
  } catch {
    return NextResponse.json({ email: session.email, accountType: null });
  }
}
