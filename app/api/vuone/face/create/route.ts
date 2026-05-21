import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  const tag = '[face/create]';
  try {
    const { accountId } = await req.json();
    console.log(`${tag} START accountId=${accountId}`);

    const { baseUrl, headers } = await fetchVuOneClient();
    console.log(`${tag} baseUrl=${baseUrl} X-Business-Id=${headers['X-Business-Id']}`);

    const res = await fetch(`${baseUrl}/api/v1/face`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ accountId }),
    });

    console.log(`${tag} response status=${res.status}`);
    const data = await res.json().catch(() => ({}));
    console.log(`${tag} response body=${JSON.stringify(data)}`);

    if (!res.ok) {
      console.error(`${tag} FAILED status=${res.status} code=${(data as Record<string, unknown>)?.code}`);
      return NextResponse.json(
        { error: `Face factor creation failed: ${res.status}`, detail: data },
        { status: res.status >= 400 && res.status < 500 ? res.status : 502 }
      );
    }

    console.log(`${tag} SUCCESS factorId=${(data as Record<string, unknown>)?.id}`);
    return NextResponse.json(
      {
        result: data,
        _request: {
          method: 'POST',
          url: `${baseUrl}/api/v1/face`,
          body: { accountId },
        },
        _curl: `curl -X POST ${baseUrl}/api/v1/face \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "X-Business-Id: {{BUSINESS_ID}}" \\\n  -H "X-Channel-Id: {{CHANNEL_ID}}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"accountId":"${accountId}"}'`,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`${tag} EXCEPTION: ${message}`);
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
