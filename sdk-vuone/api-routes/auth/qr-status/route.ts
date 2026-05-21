import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { createSession, setSessionCookie, type Challenge } from '@/lib/session';

export async function GET(req: NextRequest) {
  const c = req.nextUrl.searchParams.get('c');
  if (!c) return NextResponse.json({ error: 'missing challengeId' }, { status: 400 });

  const raw = await redis.get(`qr:${c}`);

  if (!raw) {
    return NextResponse.json({ status: 'expired' });
  }

  const challenge = JSON.parse(raw) as Challenge;

  if (challenge.status === 'pending') {
    return NextResponse.json({ status: 'pending' });
  }

  // authenticated
  const session = createSession(challenge.accountName!, challenge.accountId!);
  await redis.del(`qr:${c}`);

  const res = NextResponse.json({ status: 'authenticated' });
  setSessionCookie(res, session);
  return res;
}
