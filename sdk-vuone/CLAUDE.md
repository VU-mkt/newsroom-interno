# VU ONE SDK — Directrices para Claude

Instrucciones para integrar VU ONE en cualquier proyecto Next.js 16 (App Router) usando este SDK.

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

- **Email**: usar `email_addresses: { value: [email], isIdentifier: true }`. El claim key `email` (sin `_addresses`) devuelve error 4000 "Name is required".
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
| 4000 "Name is required" | Claim key `email` inválido | Usar `email_addresses` como claim key |
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
