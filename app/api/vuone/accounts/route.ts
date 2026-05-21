import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const { baseUrl, businessId, headers } = await fetchVuOneClient();

    // Step 1: Create identity
    const identityRes = await fetch(`${baseUrl}/api/v1/identities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        identityType: 'PERSON',
        name: email,
        lifecycleState: 'ACTIVE',
      }),
    });

    if (!identityRes.ok) {
      const err = await identityRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Identity creation failed: ${identityRes.status}`, detail: err },
        { status: 502 }
      );
    }

    const identity = await identityRes.json();

    // Step 2: Create account
    const accountRes = await fetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        accountType: 'CUSTOMER',
        businessId,
        identityId: identity.id,
        lifecycleState: 'ACTIVE',
        claims: {
          email_addresses: { value: [email], isIdentifier: true },
        },
      }),
    });

    // If account already exists (5000), look it up and return its ID
    if (!accountRes.ok) {
      const err = await accountRes.json().catch(() => ({}));
      const isAlreadyExists = (err as { code?: number }).code === 5000;

      if (isAlreadyExists) {
        const { baseUrl: bUrl, headers } = await fetchVuOneClient();
        const searchRes = await fetch(
          `${bUrl}/api/v1/accounts/identifier?filter=${encodeURIComponent(email)}&identifierType=ALL`,
          { headers }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const existing = searchData.content?.[0];
          if (existing?.accountId) {
            // Fetch account details to recover identityId
            const accountDetailRes = await fetch(`${bUrl}/api/v1/accounts/${existing.accountId}`, { headers });
            const accountDetail = accountDetailRes.ok ? await accountDetailRes.json().catch(() => null) : null;
            return NextResponse.json(
              {
                accountId: existing.accountId,
                identity: accountDetail?.identityId ? { id: accountDetail.identityId } : null,
                account: accountDetail,
                _existing: true,
                _curl: `# Account already exists — retrieved by identifier\ncurl "${bUrl}/api/v1/accounts/identifier?filter=${encodeURIComponent(email)}&identifierType=ALL" \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "X-Business-Id: {{BUSINESS_ID}}" \\\n  -H "X-Channel-Id: {{CHANNEL_ID}}"`,
              },
              { status: 200 }
            );
          }
        }
      }

      return NextResponse.json(
        { error: `Account creation failed: ${accountRes.status}`, detail: err },
        { status: 502 }
      );
    }

    const account = await accountRes.json();

    return NextResponse.json(
      {
        accountId: account.id,
        identity,
        account,
        _curl: `# Step 1: Create identity\ncurl -X POST ${baseUrl}/api/v1/identities \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"identityType":"PERSON","name":"${email}","lifecycleState":"ACTIVE"}'\n\n# Step 2: Create account\ncurl -X POST ${baseUrl}/api/v1/accounts \\\n  -H "Authorization: Bearer {{access_token}}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"accountType":"CUSTOMER","businessId":"{{BUSINESS_ID}}","identityId":"<identity_id>","lifecycleState":"ACTIVE","claims":{"email_addresses":{"value":["${email}"],"isIdentifier":true}}}'`,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
