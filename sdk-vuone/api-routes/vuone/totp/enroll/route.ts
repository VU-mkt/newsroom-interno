import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  try {
    const { accountName } = await req.json();

    if (!accountName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { baseUrl, headers } = await fetchVuOneClient();

    const res = await fetch(`${baseUrl}/api/v1/custom-workflows/totp-by-account`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ accountName }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error ?? `Enrollment failed: ${res.status}`, detail: data },
        { status: res.status >= 400 && res.status < 500 ? res.status : 502 }
      );
    }

    return NextResponse.json(
      {
        ...(data as object),
        _curl: `curl -X POST ${baseUrl}/api/v1/custom-workflows/totp-by-account \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "X-Business-Id: {{BUSINESS_ID}}" \\\n  -H "X-Channel-Id: {{CHANNEL_ID}}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"accountName":"${accountName}"}'`,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
