import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

// GET /api/vuone/face/pipeline?identityId=xxx&action=FACTOR_VALIDATE_FACE_REGISTRATION
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const identityId = searchParams.get('identityId');
    const action = searchParams.get('action');

    if (!identityId) {
      return NextResponse.json({ error: 'identityId is required' }, { status: 400 });
    }

    const { baseUrl, headers } = await fetchVuOneClient();
    const url = action
      ? `${baseUrl}/api/v1/factors/pipeline-executions/identity/${identityId}/last?actions=${action}`
      : `${baseUrl}/api/v1/factors/pipeline-executions/identity/${identityId}/last`;

    const res = await fetch(url, { method: 'GET', headers });
    const data = await res.json().catch(() => ({}));

    return NextResponse.json({ result: data, _request: { url, action } }, { status: res.ok ? 200 : res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
