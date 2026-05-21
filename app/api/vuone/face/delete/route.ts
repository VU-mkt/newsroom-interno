import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  const tag = '[face/delete]';
  try {
    const { accountId } = await req.json();
    console.log(`${tag} START accountId=${accountId}`);

    const { baseUrl, headers } = await fetchVuOneClient();
    console.log(`${tag} baseUrl=${baseUrl} X-Business-Id=${headers['X-Business-Id']}`);

    const deleteHeaders = { ...headers, 'X-Account-Id': accountId };

    const res = await fetch(`${baseUrl}/api/v1/face/all`, {
      method: 'DELETE',
      headers: deleteHeaders,
    });

    console.log(`${tag} response status=${res.status}`);

    // 204 No Content — no body
    if (res.status === 204) {
      console.log(`${tag} SUCCESS`);
      return NextResponse.json(
        {
          result: { success: true },
          _request: {
            method: 'DELETE',
            url: `${baseUrl}/api/v1/face/all`,
            headers: { 'X-Account-Id': accountId },
          },
          _curl: `curl -X DELETE ${baseUrl}/api/v1/face/all \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "X-Business-Id: {{BUSINESS_ID}}" \\\n  -H "X-Channel-Id: {{CHANNEL_ID}}" \\\n  -H "X-Account-Id: ${accountId}"`,
        },
        { status: 200 }
      );
    }

    const data = await res.json().catch(() => ({}));
    console.log(`${tag} response body=${JSON.stringify(data)}`);
    console.error(`${tag} FAILED status=${res.status} code=${(data as Record<string, unknown>)?.code}`);

    return NextResponse.json(
      { error: `Face delete failed: ${res.status}`, detail: data },
      { status: res.status >= 400 && res.status < 500 ? res.status : 502 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`${tag} EXCEPTION: ${message}`);
    return NextResponse.json({ error: message }, { status: message === 'Server misconfiguration' ? 500 : 502 });
  }
}
