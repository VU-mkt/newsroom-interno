export const FACE_DEVICE = {
  applicationVersion: '1.0',
  deviceManufacture: 'Web',
  deviceName: 'Browser',
  operativeSystem: 'Web',
  operativeSystemVersion: '1.0',
};

export async function fetchVuOneClient(): Promise<{
  baseUrl: string;
  businessId: string;
  headers: { 'Content-Type': string; Authorization: string; 'X-Business-Id': string; 'X-Channel-Id': string; 'x-original-host': string };
}> {
  const baseUrl = process.env.VUONE_BASE_URL?.replace(/\/+$/, '');
  const businessId = process.env.VUONE_BUSINESS_ID;
  const channelId = process.env.VUONE_CHANNEL_ID;
  if (!baseUrl || !businessId || !channelId) throw new Error('Server misconfiguration');
  const token = await fetchToken();
  const originalHost = new URL(baseUrl).hostname;
  return {
    baseUrl,
    businessId,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Business-Id': businessId,
      'X-Channel-Id': channelId,
      'x-original-host': originalHost,
    },
  };
}

export async function fetchToken(): Promise<string> {
  const baseUrl = process.env.VUONE_BASE_URL?.replace(/\/+$/, '');
  const clientId = process.env.VUONE_CLIENT_ID;
  const clientSecret = process.env.VUONE_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error('Server misconfiguration');
  }

  const res = await fetch(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'role_admin',
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Token fetch failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token as string;
}
