import { NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export async function GET() {
  try {
    const { baseUrl, headers } = await fetchVuOneClient();
    const url = `${baseUrl}/api/v1/policies/face`;
    const res = await fetch(url, { method: 'GET', headers });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ result: data, status: res.status, url }, { status: res.ok ? 200 : res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST() {
  try {
    const { baseUrl, headers, businessId } = await fetchVuOneClient();
    const channelId = process.env.VUONE_CHANNEL_ID!;
    const url = `${baseUrl}/api/v1/policies/face`;
    const policy = { businessId, channelId, antispoofing: false };
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(policy) });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ result: data, status: res.status, _body: policy }, { status: res.ok ? 200 : res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
