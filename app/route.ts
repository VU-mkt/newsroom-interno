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

    // Inyectar botón de logout antes de </body>. Se hace en runtime para que
    // /content/vu_newsroom.html sea byte-idéntico al original que la Routine
    // pushea en vu-mkt/newsroom (sync via GitHub Action no se interfiere).
    const finalHtml = html.replace(/<\/body>/i, `${LOGOUT_BUTTON}\n</body>`);

    return new NextResponse(finalHtml, {
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

const LOGOUT_BUTTON = `
<!-- VU ONE Auth: floating logout button (injected at runtime) -->
<style>
  #vuone-logout-btn {
    position: fixed;
    top: 28px;
    right: 24px;
    z-index: 9999;
    padding: 10px 18px;
    font: 500 13px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #1C1D1E;
    background: rgba(255,255,255,0.92);
    border: none;
    border-radius: 999px;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  }
  #vuone-logout-btn:hover {
    background: #ffffff;
    color: #1C1D1E;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.22);
  }
  #vuone-logout-btn:active { background: #1C1D1E; color: #ffffff; transform: translateY(0); box-shadow: none; }
</style>
<form id="vuone-logout-form" action="/api/auth/logout" method="GET" style="margin:0;">
  <button id="vuone-logout-btn" type="submit" title="Cerrar sesión VU ONE">Cerrar sesión</button>
</form>`;
