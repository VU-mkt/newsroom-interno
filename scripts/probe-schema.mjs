// One-off debug: descubre qué claims acepta el schema del tenant VU ONE.
// Uso: node scripts/probe-schema.mjs
//
// Requiere las mismas env vars que la app. Lee .env.local manualmente
// para no depender de dotenv.

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
const clientId = env.VUONE_CLIENT_ID;
const clientSecret = env.VUONE_CLIENT_SECRET;
const originalHost = new URL(baseUrl).hostname;

console.log('baseUrl   :', baseUrl);
console.log('businessId:', businessId);
console.log('host      :', originalHost);
console.log();

// 1. Token
const tokenRes = await fetch(`${baseUrl}/oauth2/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'role_admin',
  }).toString(),
});
if (!tokenRes.ok) {
  console.error('TOKEN FAILED', tokenRes.status, await tokenRes.text());
  process.exit(1);
}
const { access_token } = await tokenRes.json();
console.log('token OK\n');

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${access_token}`,
  'X-Business-Id': businessId,
  'X-Channel-Id': channelId,
  'x-original-host': originalHost,
};

async function probe(label, url) {
  console.log('===', label);
  console.log('GET', url);
  const r = await fetch(url, { headers });
  console.log('  status:', r.status);
  const text = await r.text();
  try {
    console.log('  body:', JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log('  body (raw):', text.slice(0, 500));
  }
  console.log();
}

// 2. Identifier claim schema
await probe(
  'identifier-claim-schema',
  `${baseUrl}/api/v1/businesses/${businessId}/identifier-claim-schema`
);

// 3. Effective claim schema (todos los claims, no solo identificadores)
await probe(
  'claim-schema-sets/effective-schema',
  `${baseUrl}/api/v1/claim-schema-sets/effective-schema?businessId=${businessId}`
);

// 4. Business details
await probe(
  'business details',
  `${baseUrl}/api/v1/businesses/${businessId}`
);
