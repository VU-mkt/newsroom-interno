import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

// GET /api/vuone/face/status?accountId=xxx
// Returns the face factors for the account + recent factor events
export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const { baseUrl, headers } = await fetchVuOneClient();

    const [factorsRes, eventsRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/face/account/${accountId}`, { method: 'GET', headers }),
      fetch(`${baseUrl}/api/v1/factors/events/account/${accountId}?pageSize=5`, { method: 'GET', headers }),
    ]);

    const factors = await factorsRes.json().catch(() => ({}));
    const events = await eventsRes.json().catch(() => ({}));

    return NextResponse.json({
      factors: { status: factorsRes.status, data: factors },
      events: { status: eventsRes.status, data: events },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
