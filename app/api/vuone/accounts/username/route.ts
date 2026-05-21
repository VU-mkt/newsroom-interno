import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  try {
    const { accountId, username } = await req.json();

    if (!accountId || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { baseUrl, businessId, headers } = await fetchVuOneClient();

    const res = await fetch(`${baseUrl}/api/v1/claim-values`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ownerId: accountId,
        ownerType: 'ACCOUNT',
        businessId,
        accountType: 'CUSTOMER',
        claims: { username: { value: username, isIdentifier: false } },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { message?: string }).message ?? `Failed to assign username: ${res.status}`, detail: err },
        { status: res.status >= 400 && res.status < 500 ? res.status : 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        accountName: username,
        _curl: `curl -X POST ${baseUrl}/api/v1/claim-values \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "X-Business-Id: {{BUSINESS_ID}}" \\\n  -H "X-Channel-Id: {{CHANNEL_ID}}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"ownerId":"${accountId}","ownerType":"ACCOUNT","businessId":"{{BUSINESS_ID}}","accountType":"CUSTOMER","claims":{"username":{"value":"${username}","isIdentifier":false}}}'`,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
