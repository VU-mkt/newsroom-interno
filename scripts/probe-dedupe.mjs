// Sanity check: buscar todas las cuentas que VU ONE tiene asociadas
// al email del usuario para verificar dedupe.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const envFile = await readFile(path.join(process.cwd(), '.env.local'), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => {
    const idx = l.indexOf('=');
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
  })
);

const baseUrl = env.VUONE_BASE_URL.replace(/\/+$/, '');
const businessId = env.VUONE_BUSINESS_ID;
const channelId = env.VUONE_CHANNEL_ID;
const originalHost = new URL(baseUrl).hostname;
const email = 'juan.lundahl@vusecurity.com';

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

console.log('Buscando cuentas para:', email);
console.log();

const searchRes = await fetch(
  `${baseUrl}/api/v1/accounts/identifier?filter=${encodeURIComponent(email)}&identifierType=ALL`,
  { headers }
);
console.log('status:', searchRes.status);
const data = await searchRes.json();
console.log('total cuentas:', data.content?.length || 0);
if (data.content?.length) {
  data.content.forEach((acc, i) => {
    console.log(`  [${i}] accountId: ${acc.accountId}  identityId: ${acc.identityId || '-'}  createdAt: ${acc._audit?.createdAt || acc.createdAt || '-'}`);
  });
}

console.log();
console.log('---');
console.log('Esperado tras este fix: 1 cuenta (la que se creó en tu último login).');
console.log('Si hay más: residuos de los intentos previos, no rompen nada.');
