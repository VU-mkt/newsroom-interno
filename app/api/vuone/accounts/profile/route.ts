import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();
    if (!identifier) return NextResponse.json({ error: 'Missing identifier' }, { status: 400 });

    const { baseUrl, businessId, headers } = await fetchVuOneClient();

    // Step 1 — look up accountId by email / username
    const searchRes = await fetch(
      `${baseUrl}/api/v1/accounts/identifier?filter=${encodeURIComponent(identifier)}&pageSize=1`,
      { headers }
    );
    if (!searchRes.ok) {
      return NextResponse.json({ error: `Identifier search failed: ${searchRes.status}` }, { status: 502 });
    }
    const searchData = await searchRes.json() as { content?: { accountId: string }[] };
    const accountId = searchData.content?.[0]?.accountId;
    if (!accountId) {
      return NextResponse.json({ error: 'No account found for that identifier' }, { status: 404 });
    }

    // Step 2 — fetch profile data in parallel
    const [accountRes, claimsRes, rolesRes, groupsRes, factorDetailsRes, activeFactorsRes] =
      await Promise.allSettled([
        fetch(`${baseUrl}/api/v1/accounts/${accountId}`, { headers }),
        fetch(`${baseUrl}/api/v1/accounts/${accountId}/claims`, { headers }),
        fetch(`${baseUrl}/api/v1/accounts/${accountId}/roles`, { headers }),
        fetch(`${baseUrl}/api/v1/accounts/${accountId}/groups`, { headers }),
        fetch(`${baseUrl}/api/v1/factors/account/${accountId}/details`, { headers }),
        fetch(`${baseUrl}/api/v1/factors/account/${accountId}/active`, { headers }),
      ]);

    const safe = async (r: PromiseSettledResult<Response>) =>
      r.status === 'fulfilled' && r.value.ok ? r.value.json().catch(() => null) : null;

    const account       = await safe(accountRes);
    const claims        = await safe(claimsRes);
    const roles         = await safe(rolesRes);
    const groups        = await safe(groupsRes);
    const factorDetails = await safe(factorDetailsRes);
    const activeFactors = await safe(activeFactorsRes);

    return NextResponse.json({
      accountId,
      account,
      claims,
      roles,
      groups,
      factorDetails,
      activeFactors,
      _request: {
        method: 'GET',
        url: `${baseUrl}/api/v1/accounts/identifier?filter=${encodeURIComponent(identifier)}&pageSize=1`,
        businessId,
      },
      _curl: `curl "${baseUrl}/api/v1/accounts/identifier?filter=${encodeURIComponent(identifier)}&pageSize=1" \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "X-Business-Id: {{BUSINESS_ID}}"`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
