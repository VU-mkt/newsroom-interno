import { NextRequest, NextResponse } from 'next/server';
import { fetchToken } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  try {
    const { accountId, otpCode } = await req.json();
    const token = await fetchToken();
    const baseUrl = process.env.VUONE_BASE_URL!;
    const businessId = process.env.VUONE_BUSINESS_ID!;
    const channelId = process.env.VUONE_CHANNEL_ID!;

    const res = await fetch(`${baseUrl}/api/v1/otp/email/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Business-Id': businessId,
        'X-Channel-Id': channelId,
      },
      body: JSON.stringify({ accountId, otpCode }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: `OTP login failed: ${res.status}`, detail: data },
        { status: res.status >= 400 && res.status < 500 ? res.status : 502 }
      );
    }

    return NextResponse.json(
      {
        result: data,
        _request: {
          method: 'POST',
          url: `${baseUrl}/api/v1/otp/email/login`,
          body: { accountId, otpCode },
        },
        _curl: `curl -X POST ${baseUrl}/api/v1/otp/email/login \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "X-Business-Id: {{BUSINESS_ID}}" \\\n  -H "X-Channel-Id: {{CHANNEL_ID}}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"accountId":"${accountId}","otpCode":"${otpCode}"}'`,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
