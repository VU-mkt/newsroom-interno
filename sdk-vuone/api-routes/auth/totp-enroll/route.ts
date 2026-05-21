import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  try {
    const { accountName, accountId, otpCode } = await req.json();

    if (!accountName || !accountId || !otpCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { baseUrl, headers } = await fetchVuOneClient();

    // 1. Verify OTP — prove the user owns the email
    const verifyRes = await fetch(`${baseUrl}/api/v1/otp/email/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ accountId, otpCode }),
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: 'Código inválido o expirado' },
        { status: 401 }
      );
    }

    // 2. Create TOTP factor — if one already exists, delete it and retry
    let totpRes = await fetch(`${baseUrl}/api/v1/custom-workflows/totp-by-account`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ accountName }),
    });

    if (totpRes.status === 409) {
      const deleteRes = await fetch(`${baseUrl}/api/v1/custom-workflows/totp-by-account`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ accountName }),
      });
      if (!deleteRes.ok) {
        const err = await deleteRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: (err as { error?: string }).error ?? 'Failed to remove existing TOTP' },
          { status: 502 }
        );
      }
      totpRes = await fetch(`${baseUrl}/api/v1/custom-workflows/totp-by-account`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ accountName }),
      });
    }

    const data = await totpRes.json().catch(() => ({}));

    if (!totpRes.ok) {
      return NextResponse.json(
        { error: data.error ?? data.message ?? 'Enrollment failed' },
        { status: totpRes.status >= 400 && totpRes.status < 500 ? totpRes.status : 502 }
      );
    }

    // 3. Store seed in httpOnly cookie
    const response = NextResponse.json({ ok: true });
    response.cookies.set('vuone_enroll', encodeURIComponent(JSON.stringify({ seed: data.seed, accountName })), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth/qr-verify',
      maxAge: 34560000,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
