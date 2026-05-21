import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST() {
  try {
    const challengeId = crypto.randomUUID();
    await redis.set(`qr:${challengeId}`, JSON.stringify({ status: 'pending' }), 'EX', 300);
    return NextResponse.json({ challengeId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
