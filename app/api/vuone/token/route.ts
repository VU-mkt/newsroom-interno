import { NextRequest, NextResponse } from 'next/server';
import { fetchToken } from '@/lib/vuone';

export async function POST(_req: NextRequest) {
  try {
    const token = await fetchToken();
    // If fetchToken() succeeded, env vars are guaranteed present (fetchToken validates them)
    const baseUrl = process.env.VUONE_BASE_URL!;
    const clientId = process.env.VUONE_CLIENT_ID!;

    return NextResponse.json({
      access_token: token,
      token_type: 'Bearer',
      _request: {
        method: 'POST',
        url: `${baseUrl}/oauth2/token`,
        body: {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: '[REDACTED]',
        },
      },
      _curl: `curl -X POST ${baseUrl}/oauth2/token \\\n  -H "Content-Type: application/x-www-form-urlencoded" \\\n  -d "grant_type=client_credentials&client_id={{CLIENT_ID}}&client_secret={{CLIENT_SECRET}}"`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
