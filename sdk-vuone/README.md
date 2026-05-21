# SDK VU ONE — Next.js Integration Kit

Archivos listos para integrar la plataforma VU ONE en cualquier app Next.js 16 (App Router).

---

## Requisitos

- Next.js 16+ (App Router)
- TypeScript
- Variables de entorno configuradas (ver `.env.example`)

---

## Instalación

### 1. Copiar archivos

```
sdk-vuone/
├── lib/
│   ├── vuone.ts        → tu-repo/lib/vuone.ts
│   └── session.ts      → tu-repo/lib/session.ts
├── proxy.ts            → tu-repo/proxy.ts
├── api-routes/         → tu-repo/app/api/   (copiar carpetas)
└── components/         → tu-repo/components/
```

**Estructura de destino en tu repo:**
```
app/
  api/
    vuone/
      token/route.ts
      accounts/route.ts
      accounts/profile/route.ts
      accounts/username/route.ts
      face/create/route.ts
      face/register/route.ts
      face/login/route.ts
      face/delete/route.ts
      face/policy/route.ts
      face/status/route.ts
      face/pipeline/route.ts
      otp-email/enroll/route.ts
      otp-email/send/route.ts
      otp-email/login/route.ts
      totp/enroll/route.ts
      totp/validate/route.ts
      passwords/route.ts
      login/route.ts
      fingerprint/browser-check/route.ts
      fingerprint/devices/route.ts
    health-check/route.ts
    auth/
      verify/route.ts
      logout/route.ts
      me/route.ts
      send-otp/route.ts
      totp-enroll/route.ts
      qr-challenge/route.ts
      qr-status/route.ts
      qr-verify/route.ts
lib/
  vuone.ts
  session.ts
proxy.ts
components/
  FaceCapture.tsx
  HealthCheckClient.tsx
```

### 2. Variables de entorno

Copiar `.env.example` a `.env.local` y completar los valores:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|----------|-------------|
| `VUONE_BASE_URL` | URL base de la instancia VU ONE (sin trailing slash) |
| `VUONE_CLIENT_ID` | Client ID para OAuth2 client_credentials |
| `VUONE_CLIENT_SECRET` | Client Secret |
| `VUONE_BUSINESS_ID` | ID del negocio (va en header `X-Business-Id`) |
| `VUONE_CHANNEL_ID` | ID del canal (va en header `X-Channel-Id`) |
| `SESSION_SECRET` | String aleatorio largo para firmar cookies de sesión |

### 3. Proxy (middleware de sesión)

`proxy.ts` reemplaza `middleware.ts` en Next.js 16. Protege todas las rutas excepto las públicas listadas en `PUBLIC_PATHS`. Ajustar si tu app tiene rutas públicas distintas.

---

## Módulos disponibles

### `lib/vuone.ts` — Helper central

```typescript
import { fetchVuOneClient, fetchToken } from '@/lib/vuone';

// Obtener baseUrl + headers autenticados para cualquier llamada a VU ONE
const { baseUrl, businessId, headers } = await fetchVuOneClient();

// Solo el token Bearer
const token = await fetchToken();
```

**Importante:** Todas las rutas API deben usar `fetchVuOneClient()`. No construir headers manualmente ni leer env vars directamente.

### `lib/session.ts` — Sesión

TTL: 30 minutos. Usar `validateSession(cookie)` para verificar sesión en server components.

---

## Rutas API

### Auth

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/auth/send-otp` | POST | Enviar OTP por email |
| `/api/auth/verify` | POST | Verificar OTP y crear sesión |
| `/api/auth/me` | GET | Datos del usuario logueado |
| `/api/auth/logout` | GET | Cerrar sesión |
| `/api/auth/totp-enroll` | POST | Enrolar TOTP |
| `/api/auth/qr-challenge` | POST | Crear challenge para login por QR |
| `/api/auth/qr-status` | GET | Consultar estado del challenge QR |
| `/api/auth/qr-verify` | POST | Verificar challenge QR desde mobile |

### Cuentas

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/vuone/token` | POST | Obtener token OAuth2 (debug) |
| `/api/vuone/accounts` | POST | Crear cuenta (identity + account + email claim) |
| `/api/vuone/accounts/profile` | POST | Buscar cuenta por email/username |
| `/api/vuone/accounts/username` | POST | Asignar username (accountName) |
| `/api/vuone/login` | POST | Login con OTP email |

### Passwords

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/vuone/passwords` | POST | Enrolar o validar password |

### OTP Email

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/vuone/otp-email/enroll` | POST | Enrolar factor OTP email |
| `/api/vuone/otp-email/send` | POST | Enviar OTP |
| `/api/vuone/otp-email/login` | POST | Validar OTP |

### TOTP

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/vuone/totp/enroll` | POST | Enrolar TOTP (devuelve QR seed) |
| `/api/vuone/totp/validate` | POST | Validar código TOTP |

### Face Recognition

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/vuone/face/create` | POST | Crear factor face (paso previo a register) |
| `/api/vuone/face/register` | POST | Registrar biometría facial |
| `/api/vuone/face/login` | POST | Autenticar por facial |
| `/api/vuone/face/delete` | DELETE | Eliminar factor face |
| `/api/vuone/face/policy` | GET/POST | Leer/actualizar política face (antispoofing, etc.) |
| `/api/vuone/face/status` | POST | Consultar estado del factor face |
| `/api/vuone/face/pipeline` | POST | Pipeline completo: create + register en un paso |

#### Body de face/register

```typescript
{
  accountId: string,
  selfieBase64: string,   // base64 sin prefijo data:, JPEG 600×720
}
```

#### Body de face/login

```typescript
{
  accountId: string,
  identityId: string,     // requerido — recuperar del paso accounts/create o GET /api/v1/accounts/{accountId}
  factorId: string,       // requerido — id devuelto por face/create (enviado como header x-device-key a VU ONE)
  selfieBase64: string,   // base64 sin prefijo data:, JPEG 600×720
}
```

**`imageType`:** usar `'SN'` (selfie neutral). Las rutas incluyen los campos de device (`applicationVersion`, `deviceManufacture`, etc.) automáticamente.

### Fingerprint

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/vuone/fingerprint/browser-check` | POST | Verificar huella de browser |
| `/api/vuone/fingerprint/devices` | GET/POST | Listar/registrar dispositivos |

### Health Check

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/health-check` | GET | Dispara ~42 GETs en paralelo, devuelve estado de todos los endpoints |

Exporta los tipos `CheckResult` y `Group` — importarlos en el client component.

---

## Componentes

### `FaceCapture.tsx`

Captura selfie desde la cámara del usuario.

```tsx
import FaceCapture from '@/components/FaceCapture';

<FaceCapture
  captured={!!selfieBase64}
  onCapture={(selfie, analysisSelfie) => {
    setSelfieBase64(selfie);
    setAnalysisSelfieBase64(analysisSelfie);
  }}
/>
```

Captura dos imágenes automáticamente:
- `selfie`: JPEG 600×720, quality 0.95 (para `selfieList`)
- `analysisSelfie`: JPEG nativa capped a 4MP, quality 0.9 (para `analysisSelfieList`)

Ambas son base64 sin prefijo `data:`.

### `HealthCheckClient.tsx`

Client component que muestra el estado de todos los endpoints VU ONE.

```tsx
import HealthCheckClient from '@/components/HealthCheckClient';

// En un server component con session guard:
<HealthCheckClient />
```

Llama a `/api/health-check` en el mount y muestra luces verdes/rojas agrupadas por API.

---

## Errores conocidos de VU ONE

| Código | Causa | Fix |
|--------|-------|-----|
| 4000 "Name is required" | Claim key `email` inválido | Usar `email_addresses` como claim key |
| 5000 "Identifier claim already exists" | Cuenta ya existe | Buscar con `GET /api/v1/accounts/identifier?filter={email}` |
| 5400 "Claim value not found" | PATCH en claim inexistente | Usar POST `/api/v1/claim-values` para crear |
| 409 "TOTP already exists" | Re-enroll de TOTP | DELETE el factor y volver a POST |
| 6150 `FACE.INTERNAL_ERROR` | Múltiples causas — ver post-mortem. Las más comunes: falta `x-original-host`, device fields incorrectos, `imageType` equivocado. | Usar `imageType: 'SN'`, incluir device fields, verificar que `fetchVuOneClient()` envía `x-original-host`. |

---

## Quirks documentados

- `identityId` **solo requerido en face/login**, no en face/register.
- `factorId` (del response de `face/create`) debe enviarse como header `x-device-key` en face/login.
- `userName` e `identityId` **no son requeridos** en face/register — el body solo necesita `accountId`, device fields y `selfieList`.
- Las rutas de `/api/user/*` se validan con cookie de sesión — agregarlas a PUBLIC_PATHS en `proxy.ts` si usás el helper de sesión de Next.js en las rutas mismas.
- `fetchVuOneClient()` hace un strip del trailing slash de `VUONE_BASE_URL` automáticamente.

---

## Post-mortem: FACE.INTERNAL_ERROR (error 6150)

La integración de face register/login estuvo rota varios días por la acumulación de errores pequeños que se reforzaban entre sí. Esto quedó documentado para evitar repetirlo en otras integraciones.

### Causas raíz (todas faltaron desde el primer commit)

| Causa | Impacto |
|---|---|
| **`x-original-host` faltante** | Header de routing multi-tenant requerido por VU ONE para identificar la instancia. Probablemente la causa más crítica — nunca aparece en mensajes de error pero hace fallar silenciosamente. |
| **Device fields faltantes** | `applicationVersion`, `deviceManufacture`, `deviceName`, `operativeSystem`, `operativeSystemVersion` son requeridos en el body. |
| **`imageType: 'JPEG'` en vez de `'SN'`** | El valor correcto es `'SN'` (selfie neutral). Se usó `'JPEG'` por error basándose en una Postman collection desactualizada. |
| **`x-device-key` faltante en login** | El `id` devuelto por `POST /api/v1/face` (face/create) debe enviarse como header `x-device-key` en face/login. |

### Cómo evitarlo

Ante cualquier error interno opaco de VU ONE, comparar **todos** los headers y campos del body contra un curl confirmado por el equipo antes de cambiar nada. No asumir que el campo más "sospechoso" es el culpable. `x-original-host` en particular no aparece en ningún mensaje de error pero es crítico para el routing.
