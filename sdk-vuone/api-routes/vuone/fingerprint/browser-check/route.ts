import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  try {
    const { accountId, fingerprint } = await req.json();
    if (!accountId || !fingerprint) {
      return NextResponse.json({ error: 'Missing accountId or fingerprint' }, { status: 400 });
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      '0.0.0.0';

    const { baseUrl, headers } = await fetchVuOneClient();

    const body = {
      accountId,
      fingerprint: { ...fingerprint, serverSide: { userData: { ip } } },
    };

    const res = await fetch(`${baseUrl}/api/v1/fingerprint/browser/check`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(
      {
        ...data,
        _request: {
          method: 'POST',
          url: `${baseUrl}/api/v1/fingerprint/browser/check`,
          body,
        },
        _curl: `curl -X POST ${baseUrl}/api/v1/fingerprint/browser/check \\\n  -H "Authorization: Bearer {{token}}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`,
      },
      { status: res.status }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
