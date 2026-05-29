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
  #vuone-logout-form {
    position: fixed;
    top: 28px;
    right: 24px;
    z-index: 9999;
    margin: 0;
    transition: opacity 0.25s ease, transform 0.25s ease;
  }
  #vuone-logout-form.vuone-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(-10px);
  }
  #vuone-logout-btn {
    padding: 10px 18px;
    font: 500 13px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #1C1D1E;
    background: #F15E37;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  }
  #vuone-logout-btn:hover {
    background: #E04E28;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.28);
  }
  #vuone-logout-btn:active { background: #C44826; transform: translateY(0); box-shadow: none; }
</style>
<form id="vuone-logout-form" action="/api/auth/logout" method="GET">
  <button id="vuone-logout-btn" type="submit" title="Cerrar sesión VU ONE">Cerrar sesión</button>
</form>
<script>
(function() {
  var lastY = 0;
  var form = document.getElementById('vuone-logout-form');
  window.addEventListener('scroll', function() {
    var y = window.scrollY;
    if (y > lastY && y > 60) {
      form.classList.add('vuone-hidden');
    } else {
      form.classList.remove('vuone-hidden');
    }
    lastY = y;
  }, { passive: true });
})();
</script>`;
