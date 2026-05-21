import { NextRequest, NextResponse } from 'next/server';
import * as OTPAuth from 'otpauth';
import redis from '@/lib/redis';
import { fetchToken } from '@/lib/vuone';
import { type Challenge } from '@/lib/session';

export async function POST(req: NextRequest) {
  // Read and validate enrollment cookie
  const rawCookie = req.cookies.get('vuone_enroll')?.value;
  if (!rawCookie) {
    return NextResponse.json({ error: 'Not enrolled on this device' }, { status: 403 });
  }

  let enrollment: { seed: string; accountName: string };
  try {
    enrollment = JSON.parse(decodeURIComponent(rawCookie));
  } catch {
    return NextResponse.json({ error: 'Not enrolled on this device' }, { status: 403 });
  }
  const { seed, accountName } = enrollment;

  try {
    const { challengeId } = await req.json();

    const [raw, token] = await Promise.all([
      redis.get(`qr:${challengeId}`),
      fetchToken(),
    ]);

    if (!raw) {
      return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 400 });
    }
    const challenge = JSON.parse(raw) as Challenge;

    if (challenge.status === 'authenticated') {
      return NextResponse.json({ error: 'Challenge already authenticated' }, { status: 409 });
    }

    // Generate TOTP server-side from the seed in the cookie
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(seed),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    const totpCode = totp.generate();

    const baseUrl = process.env.VUONE_BASE_URL!;
    const businessId = process.env.VUONE_BUSINESS_ID!;
    const channelId = process.env.VUONE_CHANNEL_ID!;

    const res = await fetch(`${baseUrl}/api/v1/custom-workflows/totp-by-account/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Business-Id': businessId,
        'X-Channel-Id': channelId,
      },
      body: JSON.stringify({ accountName, otp: totpCode }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? 'VU ONE error' }, { status: 502 });
    }

    if (!data.totpValidated) {
      return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 401 });
    }

    await redis.set(
      `qr:${challengeId}`,
      JSON.stringify({ status: 'authenticated', accountName, accountId: data.accountId }),
      'EX', 60
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
