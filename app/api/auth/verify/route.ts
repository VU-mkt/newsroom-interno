import { NextRequest, NextResponse } from 'next/server';
import { fetchToken } from '@/lib/vuone';
import { createSession, setSessionCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { accountId, email, otpCode } = await req.json();

    if (!accountId || typeof accountId !== 'string') {
      return NextResponse.json({ error: 'accountId requerido' }, { status: 400 });
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email requerido' }, { status: 400 });
    }
    if (!otpCode || typeof otpCode !== 'string' || otpCode.trim() === '') {
      return NextResponse.json({ error: 'Código OTP requerido' }, { status: 400 });
    }

    const token = await fetchToken();
    const baseUrl = process.env.VUONE_BASE_URL!;
    const businessId = process.env.VUONE_BUSINESS_ID!;
    const channelId = process.env.VUONE_CHANNEL_ID!;

    const verifyRes = await fetch(`${baseUrl}/api/v1/otp/email/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Business-Id': businessId,
        'X-Channel-Id': channelId,
      },
      body: JSON.stringify({ accountId, otpCode: otpCode.trim() }),
    });

    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 401 });
    }

    const session = createSession(email, accountId);
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, session);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
