import { NextRequest, NextResponse } from 'next/server';
import { fetchToken } from '@/lib/vuone';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.trim().toLowerCase().endsWith('@vusecurity.com')) {
      return NextResponse.json(
        { error: 'Solo se permiten emails @vusecurity.com' },
        { status: 403 }
      );
    }

    const token = await fetchToken();
    const baseUrl = process.env.VUONE_BASE_URL!;
    const businessId = process.env.VUONE_BUSINESS_ID!;
    const channelId = process.env.VUONE_CHANNEL_ID!;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Business-Id': businessId,
      'X-Channel-Id': channelId,
    };

    // 1. Buscar cuenta por email
    let accountId: string | null = null;

    const searchRes = await fetch(
      `${baseUrl}/api/v1/accounts/identifier?filter=${encodeURIComponent(email)}&identifierType=ALL`,
      { headers }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      accountId = searchData.content?.[0]?.accountId ?? null;
    }

    // 2. Si no existe, crear identidad + cuenta
    if (!accountId) {
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
        return NextResponse.json({ error: 'Error creando identidad', detail: err }, { status: 502 });
      }

      const identity = await identityRes.json();

      // NOTA: Sin 'claims' porque el schema de este business no define ninguno
      // (additionalProperties: false + properties: {}). El admin de VU ONE
      // debe definir el schema (ej. email_addresses) para soportar dedupe.
      // Mientras tanto, cada login crea identity+account nuevos (no podemos
      // buscar por claim). El OTP se envía igual via emailAddress (paso 4).
      const accountRes = await fetch(`${baseUrl}/api/v1/accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          accountType: 'CUSTOMER',
          businessId,
          identityId: identity.id,
          lifecycleState: 'ACTIVE',
        }),
      });

      if (!accountRes.ok) {
        const err = await accountRes.json().catch(() => ({}));
        return NextResponse.json({ error: 'Error creando cuenta', detail: err }, { status: 502 });
      }

      const account = await accountRes.json();
      accountId = account.id;
    }

    // 3. Enrollar OTP email (ignorar si ya está registrado)
    await fetch(`${baseUrl}/api/v1/otp/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ accountId, emailAddress: email }),
    });

    // 4. Enviar OTP
    const sendRes = await fetch(`${baseUrl}/api/v1/otp/email/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ accountId, emailAddress: email }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}));
      return NextResponse.json({ error: 'Error enviando el código', detail: err }, { status: 502 });
    }

    return NextResponse.json({ accountId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
