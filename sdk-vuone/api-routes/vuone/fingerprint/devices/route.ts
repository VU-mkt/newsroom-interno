import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }

    const { baseUrl, headers } = await fetchVuOneClient();

    const res = await fetch(
      `${baseUrl}/api/v1/fingerprint/accounts/${accountId}/devices`,
      { headers }
    );

    const data = await res.json().catch(() => ({}));

    // Defensive normalization: API docs say DeviceResponse (singular) but
    // description says "List of devices" — handle array, paginated, or single object.
    const devices = Array.isArray(data)
      ? data
      : Array.isArray(data?.content)
      ? data.content
      : data && typeof data === 'object' && !data.error
      ? [data]
      : [];

    return NextResponse.json(
      {
        devices,
        _request: {
          method: 'GET',
          url: `${baseUrl}/api/v1/fingerprint/accounts/${accountId}/devices`,
        },
        _curl: `curl ${baseUrl}/api/v1/fingerprint/accounts/${accountId}/devices \\\n  -H "Authorization: Bearer {{token}}"`,
      },
      { status: res.status }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
