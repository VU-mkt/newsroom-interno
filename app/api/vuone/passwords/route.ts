import { NextRequest, NextResponse } from 'next/server';
import { fetchToken } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  try {
    const { accountId, password } = await req.json();
    const token = await fetchToken();
    const baseUrl = process.env.VUONE_BASE_URL!;
    const businessId = process.env.VUONE_BUSINESS_ID!;
    const channelId = process.env.VUONE_CHANNEL_ID!;

    const res = await fetch(`${baseUrl}/api/v1/passwords`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        accountId,
        businessId,
        channelId,
        password,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: `Password enrollment failed: ${res.status}`, detail: data },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        result: data,
        _request: {
          method: 'POST',
          url: `${baseUrl}/api/v1/passwords`,
          body: { accountId, businessId: '[from env]', channelId: '[from env]', password: '[REDACTED]' },
        },
        _curl: `curl -X POST ${baseUrl}/api/v1/passwords \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"accountId":"${accountId}","businessId":"{{BUSINESS_ID}}","channelId":"{{CHANNEL_ID}}","password":"{{password}}"}'`,
      },
      { status: res.status }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
