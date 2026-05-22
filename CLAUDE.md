# VU ONE SDK — Directrices para Claude

Instrucciones para integrar VU ONE en cualquier proyecto Next.js 16 (App Router) usando este SDK.

---

## 🗺 Este proyecto en particular — VU Newsroom Interno (mayo 2026)

Este repo (`vu-mkt/newsroom-interno`) es el **deploy con MFA** del VU Newsroom. **No es el origen del contenido** — solo la capa de auth.

### Arquitectura completa

```
┌──────────────────────────────────────────────────────────────┐
│ Routine "vu-newsroom-curaduria-semanal" (Claude Cowork)      │
│   ↓ pushea contenido diario via GitHub API                   │
│ vu-mkt/newsroom (repo PRIVADO, origen del HTML)              │
│   ↓ GitHub Action .github/workflows/sync-to-interno.yml      │
│ vu-mkt/newsroom-interno (ESTE repo, contenido + auth)        │
│   ↓ Vercel auto-deploy                                       │
│ newsroom-interno.vercel.app  (sitio final con MFA)           │
│   Login: VU ONE Email OTP @vusecurity.com                    │
└──────────────────────────────────────────────────────────────┘
```

### Routing de cambios — dónde editar cada cosa

Cuando el usuario diga "cambiá X del newsroom", usar esta tabla para decidir qué repo tocar. **Nunca editar `content/vu_newsroom.html` directamente en ESTE repo** — el Action lo va a sobrescribir en el próximo run de la Routine.

| Tipo de cambio | Repo / archivo a editar | Cómo se aplica |
|---|---|---|
| Noticias / briefings / items del día | NO tocar. La Routine lo hace sola diariamente. | Sync automático |
| HTML, CSS, estructura del newsroom (masthead, layout, copy, secciones, colores del briefing) | `vu-mkt/newsroom/vu_newsroom.html` via GitHub API con `$env:GITHUB_TOKEN` | Push → Action sync → Vercel redeploy |
| Logos / imágenes del newsroom | `vu-mkt/newsroom/*.png` via GitHub API | Push → Action sync → Vercel redeploy |
| Página `/login`, dashboard, flujo de auth, env vars | ESTE repo (`newsroom-interno`) → `app/login/page.tsx`, `app/route.ts`, `lib/session.ts`, `app/api/auth/*` | Push → Vercel redeploy |
| Botón flotante de logout (estilo, posición) | ESTE repo → `app/route.ts` (constante `LOGOUT_BUTTON`, inyectado en runtime antes de `</body>`) | Push → Vercel redeploy |
| Sync entre repos / Action | `vu-mkt/newsroom/.github/workflows/sync-to-interno.yml` | Push → corre en el próximo evento |
| Reglas/criterios de la Routine | `C:/Users/JuanLundahl/.claude/scheduled-tasks/vu-newsroom-curaduria-semanal/SKILL.md` | Activo en el próximo run |
| Skill canónica del VU Journalist | `C:/Users/JuanLundahl/OneDrive*/Documentos/Claude Cowork/Agents/VU Division/VU Journalist/marketing-vu-journalist.md` | Activo en próxima invocación |
| Permisos PowerShell de la Routine (zero prompts) | `C:/Users/JuanLundahl/OneDrive*/Documentos/Claude Cowork/Outputs/VU Journalist/.claude/settings.json` | Activo inmediato |

### Patrones recurrentes

- **Edición del HTML del newsroom**: usar script PowerShell con `Invoke-RestMethod` + `$env:GITHUB_TOKEN`. **Importante**: si hacés múltiples reemplazos, NO calcular índices de string ANTES de modificar — usar `String.Replace` toda en una pasada, o re-encontrar índices después de cada `.Replace`. (Bug histórico: 2026-05-22, corte mid-SVG por índice stale.)
- **El logout button se inyecta en runtime** en `app/route.ts` justo antes de `</body>`. NO está hardcoded en el HTML del newsroom (eso garantiza que el sync no lo pise).
- **Schema de claims VU ONE en `demos.prod.vu-one.com` business Marketing**: el claim key correcto es `email_address` (singular, string), NO `email_addresses` (plural, array). Ver `app/api/auth/send-otp/route.ts`.

### Drift conocido

- `lib/session.ts` originalmente usaba `process.env.AUTH_SECRET` — corregido a `SESSION_SECRET` para alinear con `.env.example`.
- `proxy.ts` (middleware) fue **eliminado** por bug Next.js 16 + Vercel ([thread](https://community.vercel.com/t/next-js-16-middleware-returns-404-sitewide-on-vercel/39029)). La auth ahora vive en `app/route.ts` como route handler.

---

## ⚠ Drift status (mayo 2026)

El SDK cubre la integración VU ONE base (auth + face) pero NO incluye los helpers más recientes del main app. Antes de usar el SDK en producción, verificar si necesitás portear:

| Helper / endpoint | Para qué | Ubicación en main app |
|---|---|---|
| `lib/camera.ts` | `openCamera(facing)` con fallback ideal→any | `lib/camera.ts` |
| `lib/pkpass-signer.ts` | Firmar Apple Wallet passes (node-forge PKCS#7) | `lib/pkpass-signer.ts` |
| `lib/wallet-pass-sign.ts` | HMAC sign/verify de QR del pass | `lib/wallet-pass-sign.ts` |
| `lib/otp-token.ts` | Token HMAC post-OTP-verify | `lib/otp-token.ts` |
| `lib/g66-challenge-store.ts` | Redis-or-Map TTL store para handoffs | `lib/g66-challenge-store.ts` |
| `lib/global66-email-identity.ts` | Inferir nombre/empresa del email | `lib/global66-email-identity.ts` |
| `app/api/global66/enroll/*` | Enroll flow con OTP + PKPass | `app/api/global66/enroll/{,send-otp,verify-otp}/route.ts` |
| `app/api/global66/wallet-pass/verify` | Verify HMAC del pass | `app/api/global66/wallet-pass/verify/route.ts` |
| `app/api/global66/device-info` | Geo+UA fingerprinting | `app/api/global66/device-info/route.ts` |

Estos son específicos del demo "vertical" pattern (Global66, Flamengo) — copiarlos al SDK solo si tu proyecto necesita el mismo patrón. Si solo necesitás auth + face básicos, el SDK ya está completo para eso.

---

## Stack requerido

Next.js 16 App Router, TypeScript, Tailwind CSS. Las rutas API asumen el App Router de Next.js con `route.ts`.

---

## Variables de entorno

```bash
VUONE_BASE_URL=https://tu-instancia.vu-one.com/middleware   # sin trailing slash
VUONE_CLIENT_ID=...
VUONE_CLIENT_SECRET=...
VUONE_BUSINESS_ID=...
VUONE_CHANNEL_ID=...
SESSION_SECRET=...   # string largo aleatorio para firmar cookies
```

---

## Integración VU ONE — Reglas Críticas

### Helper obligatorio

Todas las rutas API deben usar `fetchVuOneClient()` de `lib/vuone.ts`:
```ts
const { baseUrl, businessId, headers } = await fetchVuOneClient();
```
Retorna `baseUrl`, `businessId` y `headers` con:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- `X-Business-Id`
- `X-Channel-Id`
- `x-original-host` — **crítico para routing multi-tenant de VU ONE**

**Nunca** construir headers manualmente ni leer `process.env.VUONE_*` directamente en las rutas.

### `x-original-host` — header crítico

VU ONE usa `x-original-host` para identificar a qué instancia apuntar en ambientes multi-tenant. Si falta, la API devuelve errores opacos (como `FACE.INTERNAL_ERROR` código 6150) sin mencionar el header en el mensaje de error. `fetchVuOneClient()` lo incluye automáticamente derivándolo de `VUONE_BASE_URL`.

### Claim keys

- **Email**: usar `email_address: { value: email, isIdentifier: true }` (singular, valor string). La versión anterior de este doc decía `email_addresses` (plural) y `value: [email]` (array) — **incorrecto** en al menos `demos.prod.vu-one.com` business Marketing, devuelve `4312 ACCOUNT.CLAIM_SCHEMA_VALIDATION_ERROR`. Verificar el schema real del tenant con `GET /api/v1/businesses/{id}/identifier-claim-schema?accountType=CUSTOMER` antes de asumir el nombre.
- **Claims nuevos**: usar `POST /api/v1/claim-values`. El `PATCH /api/v1/owners/{type}/{id}/claim-values/{key}` solo funciona si el claim ya existe (error 5400 si no existe).

### TOTP por accountName

- `POST /api/v1/custom-workflows/totp-by-account` requiere `accountName`.
- `POST /api/v1/custom-workflows/totp-by-account/validate` requiere `{ accountName, otp }`.
- `accountName` es independiente del email.

### Sesiones

TTL: 30 minutos. Configurado en `lib/session.ts`. Usar `validateSession(cookie)` para verificar en server components.

---

## Face Recognition

### Flujo completo

1. `POST /api/vuone/face/create` — crea el factor face. Devuelve `{ result: { id } }` — guardar `id` como `factorId`.
2. `POST /api/vuone/face/register` — registra la biometría.
3. `POST /api/vuone/face/login` — autentica por facial.

### face/register

**Body** (solo estos campos):
```ts
{
  accountId: string,
  // FACE_DEVICE se incluye automáticamente desde lib/vuone.ts:
  applicationVersion: '1.0',
  deviceManufacture: 'Web',
  deviceName: 'Browser',
  operativeSystem: 'Web',
  operativeSystemVersion: '1.0',
  selfieList: [{ file: selfieBase64, imageType: 'SN' }],
}
```

`identityId`, `userName`, `showError`, `analysisSelfieList` — **no incluir**, no son requeridos y pueden causar errores.

### face/login

**Body**:
```ts
{
  identityId: string,   // requerido — del paso create account
  accountId: string,
  // FACE_DEVICE igual que register
  selfieList: [{ file: selfieBase64, imageType: 'SN' }],
}
```

**Header adicional**:
```
x-device-key: <factorId>   // el id devuelto por face/create
```

En código:
```ts
const loginHeaders = factorId ? { ...headers, 'x-device-key': factorId } : headers;
```

### imageType

Usar siempre `'SN'` (selfie neutral) — confirmado por el equipo de VU ONE. `'JPEG'` u otros valores causan error 6150.

### Selfie format

- JPEG, 600 × 720 px, quality 0.95
- Base64 sin prefijo `data:`
- `FaceCapture.tsx` (incluido en el SDK) captura con estas especificaciones automáticamente

### FACE_DEVICE

El objeto de device fields está exportado como `FACE_DEVICE` en `lib/vuone.ts`. Usarlo con spread en el body:
```ts
import { FACE_DEVICE } from '@/lib/vuone';
const body = { accountId, ...FACE_DEVICE, selfieList: [...] };
```

---

## Errores conocidos de VU ONE

| Código | Causa | Fix |
|--------|-------|-----|
| 4312 "ACCOUNT.CLAIM_SCHEMA_VALIDATION_ERROR" | Claim key o tipo de valor no coincide con el schema del tenant | Verificar schema con `GET /api/v1/businesses/{id}/identifier-claim-schema?accountType=CUSTOMER`. Para `demos.prod.vu-one.com` Marketing: `email_address` (singular) con `value` como string |
| 5000 "Identifier claim already exists" | Cuenta ya existe con ese email | Buscar con `GET /api/v1/accounts/identifier?filter={email}&identifierType=ALL`, leer `content[0].accountId` |
| 5400 "Claim value not found" | PATCH en claim inexistente | Usar `POST /api/v1/claim-values` para crear |
| 409 "TOTP already exists" | Re-enroll de TOTP | DELETE el factor existente y volver a POST |
| 6150 `FACE.INTERNAL_ERROR` | Múltiples causas — ver post-mortem | Verificar `x-original-host`, device fields, `imageType: 'SN'`, y `x-device-key` en login |

---

## Post-mortem: FACE.INTERNAL_ERROR (error 6150)

La integración de face register/login estuvo rota varios días por la acumulación de estos errores:

| Causa | Por qué es difícil de detectar |
|---|---|
| `x-original-host` faltante | No aparece en el mensaje de error. VU ONE falla silenciosamente sin él. |
| Device fields faltantes | `applicationVersion`, `deviceManufacture`, `deviceName`, `operativeSystem`, `operativeSystemVersion` — todos requeridos. |
| `imageType: 'JPEG'` en vez de `'SN'` | El valor correcto es `'SN'`. Se usó `'JPEG'` por error basándose en una Postman collection desactualizada. |
| `x-device-key` faltante en login | El `id` de `face/create` debe ir como header `x-device-key` en face/login. |

**Lección**: ante cualquier error opaco de VU ONE, comparar **todos** los headers y campos del body contra un curl confirmado por el equipo antes de cambiar nada.

---

## proxy.ts (middleware de sesión)

`proxy.ts` reemplaza `middleware.ts` en Next.js 16. Ajustar `PUBLIC_PATHS` según las rutas públicas del proyecto. Por defecto protege todo excepto `/login`, `/api/auth`, y assets estáticos.

---

## Mantenimiento de este archivo

Actualizar este `CLAUDE.md` cuando:
- Se descubran nuevos errores de VU ONE y sus fixes
- Cambien los body shapes o headers requeridos por la API
- Se agreguen nuevas rutas al SDK
