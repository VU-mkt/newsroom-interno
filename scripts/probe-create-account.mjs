// Probe: intentar crear identity + account con distintos claim keys
// para encontrar el que esta instancia acepta.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const envFile = await readFile(path.join(process.cwd(), '.env.local'), 'utf-8');
const env = Object.fromEntries(
  envFile
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const baseUrl = env.VUONE_BASE_URL.replace(/\/+$/, '');
const businessId = env.VUONE_BUSINESS_ID;
const channelId = env.VUONE_CHANNEL_ID;
const originalHost = new URL(baseUrl).hostname;

const tokenRes = await fetch(`${baseUrl}/oauth2/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.VUONE_CLIENT_ID,
    client_secret: env.VUONE_CLIENT_SECRET,
    scope: 'role_admin',
  }).toString(),
});
const { access_token } = await tokenRes.json();

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${access_token}`,
  'X-Business-Id': businessId,
  'X-Channel-Id': channelId,
  'x-original-host': originalHost,
};

const ts = Date.now();

async function tryCreate(label, claimsObj) {
  const email = `probe-${label}-${ts}@vusecurity.com`;
  console.log(`\n=== Trying ${label} | email: ${email}`);

  const idRes = await fetch(`${baseUrl}/api/v1/identities`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ identityType: 'PERSON', name: email, lifecycleState: 'ACTIVE' }),
  });
  if (!idRes.ok) {
    console.log('  identity FAIL', idRes.status, await idRes.text());
    return;
  }
  const identity = await idRes.json();
  console.log('  identity OK', identity.id);

  const accBody = {
    accountType: 'CUSTOMER',
    businessId,
    identityId: identity.id,
    lifecycleState: 'ACTIVE',
    ...(claimsObj ? { claims: claimsObj } : {}),
  };
  const accRes = await fetch(`${baseUrl}/api/v1/accounts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(accBody),
  });
  const body = await accRes.text();
  console.log('  account status:', accRes.status);
  console.log('  account body:', body.slice(0, 400));
}

// Try with email_address (singular, per admin)
await tryCreate('email_address-singular', {
  email_address: { value: [`probe-singular-${ts}@vusecurity.com`], isIdentifier: true },
});

// Try with email_address as plain string (not array)
await tryCreate('email_address-string', {
  email_address: { value: `probe-string-${ts}@vusecurity.com`, isIdentifier: true },
});

// Also try the identifier-claim-schema endpoint with accountType param
console.log('\n=== identifier-claim-schema with accountType=CUSTOMER');
const schemaRes = await fetch(
  `${baseUrl}/api/v1/businesses/${businessId}/identifier-claim-schema?accountType=CUSTOMER`,
  { headers }
);
console.log('  status:', schemaRes.status);
console.log('  body:', await schemaRes.text());
