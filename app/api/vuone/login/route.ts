import { NextRequest, NextResponse } from 'next/server';
import { fetchToken } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  try {
    const { accountId, password } = await req.json();
    const token = await fetchToken();
    const baseUrl = process.env.VUONE_BASE_URL!;
    const businessId = process.env.VUONE_BUSINESS_ID!;
    const channelId = process.env.VUONE_CHANNEL_ID!;

    const res = await fetch(`${baseUrl}/api/v1/passwords/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Business-Id': businessId,
        'X-Channel-Id': channelId,
      },
      body: JSON.stringify({ accountId, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: `Login failed: ${res.status}`, detail: data },
        { status: res.status === 403 || res.status === 404 || res.status === 422 ? res.status : 502 }
      );
    }

    return NextResponse.json(
      {
        result: data,
        _request: {
          method: 'POST',
          url: `${baseUrl}/api/v1/passwords/login`,
          body: { accountId, password: '[REDACTED]' },
        },
        _curl: `curl -X POST ${baseUrl}/api/v1/passwords/login \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "X-Business-Id: {{BUSINESS_ID}}" \\\n  -H "X-Channel-Id: {{CHANNEL_ID}}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"accountId":"${accountId}","password":"{{password}}"}'`,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
