# VU ONE SDK — Guía rápida para integrar (no necesitas saber programar)

Este paquete contiene **todo lo que un programador necesita** para conectar tu sitio web con VU ONE (la plataforma de identidad de VU Security). Vos no tenés que escribir código — basta con seguir los pasos de abajo y dárselo a tu equipo de desarrollo, a un freelancer, o a una IDE con AI (Cursor, Claude Code, Lovable, v0).

---

## 1. Qué hay adentro de este zip

```
sdk-vuone/
├── QUICKSTART.md           ← ESTE archivo (leelo primero)
├── README.md               ← Detalles técnicos para el programador
├── CLAUDE.md               ← Reglas para Claude / Cursor / IDEs con AI
├── .env.example            ← Variables de entorno que hay que completar
├── lib/                    ← Código común (token, sesión, helpers)
├── api-routes/             ← Endpoints listos (auth, face, OTP, TOTP, fingerprint)
├── components/             ← Componentes UI (FaceCapture, HealthCheck)
├── proxy.ts                ← Middleware de protección de rutas
└── api-specs/              ← Documentación OpenAPI oficial de VU ONE
    ├── api-docsvuone.json       (API principal: cuentas, identidades, OAuth2)
    ├── factorapi-docs.json      (factores: TOTP, OTP email/SMS, face, passwords)
    └── fingerprintapi-docs.json (huella de dispositivos)
```

---

## 2. Qué hace este SDK

Conecta tu sitio web con VU ONE para que tus usuarios puedan:

- **Crear cuenta** con email
- **Loguearse** por código por email (OTP), QR, contraseña, TOTP (Google Authenticator), o reconocimiento facial
- **Verificar dispositivos** (huella digital del browser)
- **Gestionar perfiles** y métodos de autenticación

El SDK trae todos los endpoints, todas las llamadas a VU ONE, manejo de errores y los componentes visuales (captura de cara, monitor de salud de la API). Tu desarrollador solo necesita pegarlo en un proyecto Next.js y configurar 6 variables.

---

## 3. Pre-requisitos

Antes de empezar la integración, conseguí estos datos de **VU Security** (pedíselos al equipo comercial o al sales engineer asignado):

| Dato | Para qué sirve | Ejemplo |
|------|----------------|---------|
| **VUONE_BASE_URL** | La dirección de tu instancia VU ONE | `https://demos.prod.vu-one.com/middleware` |
| **VUONE_CLIENT_ID** | Tu identificador OAuth2 | `mi-cliente-abc` |
| **VUONE_CLIENT_SECRET** | Tu clave secreta OAuth2 | `xy12...` (¡no compartir!) |
| **VUONE_BUSINESS_ID** | ID de tu negocio en VU ONE | `b-001` |
| **VUONE_CHANNEL_ID** | ID del canal | `web-001` |

Generá vos mismo:

| Dato | Cómo |
|------|------|
| **SESSION_SECRET** | Cualquier texto largo aleatorio (mínimo 32 caracteres). Podés generarlo en https://www.random.org/passwords/ pidiendo 64 caracteres. **Guardalo seguro** — sirve para firmar las cookies de sesión de tus usuarios. |

---

## 4. Pasos para tu desarrollador (o IDE con AI)

### Opción A — Tenés un programador

Mandale este zip y decile:

> "Necesito integrar VU ONE en un proyecto Next.js 16 (App Router). En el zip está el SDK completo con README, código y la documentación OpenAPI. Empezá por leer `QUICKSTART.md` y `README.md`. Las variables las paso por separado."

Después le pasás (por canal seguro, no por mail) los valores de la tabla del punto 3.

### Opción B — Usás Cursor / Claude Code / Lovable / v0

1. Crear un proyecto Next.js 16 nuevo (la IDE puede hacerlo por vos pidiéndoselo).
2. Descomprimir este zip dentro de la carpeta del proyecto.
3. Abrir la IDE con AI y darle este prompt:

> "Tengo el SDK de VU ONE en la carpeta `sdk-vuone/`. Integralo en este proyecto siguiendo `sdk-vuone/README.md`. Después de copiar los archivos a sus ubicaciones (`lib/`, `app/api/`, `components/`, `proxy.ts`), pedíme las variables de entorno que faltan. Respetá las reglas del archivo `sdk-vuone/CLAUDE.md`, especialmente la del header `x-original-host` y el `imageType: 'SN'` para face."

4. La IDE va a pedirte las 6 variables del punto 3 — pegáselas.
5. Listo. Probá levantando el proyecto local (`npm run dev`) o deployando a Vercel.

### Opción C — Quiero ver una demo funcionando primero

Visitá **https://vuone-two.vercel.app** — es la demo de referencia con todas las funcionalidades activas. El código fuente está en https://github.com/sstranieri/vuone (este repo es justamente el "main app" que generó el SDK).

---

## 5. Cosas que el desarrollador NO puede olvidar

Estas son las trampas que nos costaron días de debugging. Compartíselas explícitamente — están en `CLAUDE.md` y `README.md` también, pero acá las tenés resumidas:

1. **Header `x-original-host`** — `fetchVuOneClient()` lo manda automáticamente. Si alguien arma una llamada a VU ONE "a mano" sin usar ese helper, va a fallar con errores opacos (especialmente face).
2. **Claim key del email**: usar `email_addresses`, **no** `email`. Si usás `email` solo, VU ONE devuelve "Name is required" (error 4000).
3. **Face recognition**: usar `imageType: 'SN'` (selfie neutral). Cualquier otro valor (`'JPEG'`, etc.) tira error 6150.
4. **`x-device-key` en face login**: el `id` que devuelve `face/create` se manda como header `x-device-key` cuando hacés login. Si falta, el login falla.
5. **Secretos**: nunca pegar `VUONE_CLIENT_SECRET` ni `SESSION_SECRET` en código, ni commitearlos al repo. Van solo en `.env.local` (local) y en variables de entorno de Vercel (producción).

---

## 6. Cómo deployar a producción (Vercel)

1. Tu desarrollador hace `git push` del proyecto a GitHub.
2. Conectás el repo de GitHub a Vercel (botón "Import Project").
3. En Vercel: **Settings → Environment Variables**, cargás las 6 variables del punto 3 (asegurándote de marcar las 3 environments: Production, Preview, Development).
4. Vercel deploya automáticamente. Tu sitio queda en `https://tu-proyecto.vercel.app`.

---

## 7. Verificación post-integración

Después de la integración, abrí `https://tu-sitio.com/health-check` (lo provee el SDK). Vas a ver luces verdes/rojas para cada endpoint VU ONE — todo verde = todo OK.

Si ves rojo en algunos:
- Endpoints `/status` y `/version` rojos → variables de entorno mal cargadas.
- Endpoints `face/*` rojos → revisar `x-original-host` y `imageType` (punto 5).
- Otros → mandarle el screenshot al equipo de VU Security con `VUONE_BASE_URL`, `VUONE_BUSINESS_ID` y el error exacto.

---

## 8. Documentación adicional

- `README.md` — referencia completa de todas las rutas, parámetros y respuestas.
- `CLAUDE.md` — reglas detalladas para que IDEs con AI no metan la pata.
- `api-specs/*.json` — los OpenAPI specs oficiales de VU ONE. Útil si el dev quiere ver el detalle exacto de algún endpoint o agregar uno que no esté en el SDK.

---

## 9. Soporte

- Bugs o dudas técnicas: tu sales engineer de VU Security.
- Issues del SDK específicamente: https://github.com/sstranieri/vuone/issues
