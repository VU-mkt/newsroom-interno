import { cookies } from 'next/headers';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/session';

// Sin proxy.ts (bug conocido de Next.js 16 + Vercel),
// la auth la hace este route handler en cada request.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  const session = sessionCookie ? validateSession(sessionCookie) : null;

  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', '/');
    return NextResponse.redirect(loginUrl);
  }

  try {
    const html = await readFile(
      path.join(process.cwd(), 'content', 'vu_newsroom.html'),
      'utf-8'
    );
    return new NextResponse(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'private, no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Newsroom not found', detail: message }, { status: 500 });
  }
}
