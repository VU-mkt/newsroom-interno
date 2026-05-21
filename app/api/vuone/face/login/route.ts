import { NextRequest, NextResponse } from 'next/server';
import { fetchVuOneClient, FACE_DEVICE } from '@/lib/vuone';

const tag = '[face/login]';

export async function POST(req: NextRequest) {
  try {
    const { accountId, identityId, factorId, selfieBase64 } = await req.json();
    const { baseUrl, headers } = await fetchVuOneClient();

    console.log(`${tag} === REQUEST ===`);
    console.log(`${tag} accountId=${accountId}`);
    console.log(`${tag} identityId=${identityId}`);
    console.log(`${tag} factorId=${factorId}`);
    console.log(`${tag} selfieBytes=${selfieBase64?.length ?? 0}`);
    console.log(`${tag} baseUrl=${baseUrl}`);
    console.log(`${tag} x-original-host=${headers['x-original-host']}`);
    console.log(`${tag} X-Business-Id=${headers['X-Business-Id']}`);
    console.log(`${tag} X-Channel-Id=${headers['X-Channel-Id']}`);

    const body = {
      identityId,
      accountId,
      ...FACE_DEVICE,
      selfieList: [{ file: selfieBase64, imageType: 'SN' }],
    };

    const loginHeaders = factorId ? { ...headers, 'x-device-key': factorId } : headers;

    const bodyJson = JSON.stringify(body);
    console.log(`${tag} === SENDING TO VUONE ===`);
    console.log(`${tag} url=${baseUrl}/api/v1/face/login`);
    console.log(`${tag} x-device-key=${factorId ?? 'none'}`);
    console.log(`${tag} bodyBytes=${bodyJson.length}`);
    console.log(`${tag} bodyShape=${JSON.stringify({ identityId, accountId, ...FACE_DEVICE, selfieList: [{ imageType: 'SN', fileBytes: selfieBase64?.length }] })}`);

    const res = await fetch(`${baseUrl}/api/v1/face/login`, {
      method: 'POST',
      headers: loginHeaders,
      body: bodyJson,
    });

    console.log(`${tag} === VUONE RESPONSE ===`);
    console.log(`${tag} status=${res.status}`);
    console.log(`${tag} statusText=${res.statusText}`);
    const resHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => { resHeaders[k] = v; });
    console.log(`${tag} headers=${JSON.stringify(resHeaders)}`);

    const data = await res.json().catch(() => ({}));
    console.log(`${tag} body=${JSON.stringify(data)}`);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Face login failed: ${res.status}`, detail: data },
        { status: res.status >= 400 && res.status < 500 ? res.status : 502 }
      );
    }

    console.log(`${tag} SUCCESS`);
    return NextResponse.json(
      {
        result: data,
        _request: {
          method: 'POST',
          url: `${baseUrl}/api/v1/face/login`,
          body: { identityId, accountId, ...FACE_DEVICE, selfieList: '[1 pose: SN]' },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`${tag} EXCEPTION: ${message}`);
    if (err instanceof Error) console.error(`${tag} STACK: ${err.stack}`);
    const status = message === 'Server misconfiguration' ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
