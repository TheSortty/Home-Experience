# HOME Experience — Campus & Admin

> Plataforma educativa para el programa CRESER de coaching ontológico.  
> Campus virtual para alumnos + panel de gestión para staff.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth + RLS) · Cloudflare Workers (OpenNext) · Tailwind CSS · Framer Motion

**Monorepo (npm workspaces):** el sitio se separó en dos Workers de Cloudflare
independientes que comparten el mismo proyecto de Supabase — `apps/marketing`
(landing + admin, en `siendohome.com`) y `apps/campus` (alumno, en
`campus.siendohome.com`) — más dos paquetes compartidos en `packages/`. Ver
[Setup local](#setup-local) para correr los dos a la vez.

---

## Índice

- [Estructura del proyecto](#estructura-del-proyecto)
- [Setup local](#setup-local)
- [Base de datos](#base-de-datos)
- [Roles y permisos](#roles-y-permisos)
- [Verificación completa](#verificación-completa)
- [Deploy](#deploy)
- [Google Calendar del alumno](#google-calendar-del-alumno)
- [Variables de entorno](#variables-de-entorno)

---

## Estructura del proyecto

```
apps/
├── marketing/             → Worker "home-experience" — siendohome.com
│   └── src/app/
│       ├── (public)/      → Landing pública (testimonios, formulario CRESER)
│       ├── admin/         → Panel de gestión (protegido por rol staff)
│       ├── auth/          → Login, registro, recuperar contraseña
│       └── api/
│           ├── reviews/            → Proxy a Google Places API
│           ├── admin/create-student/
│           └── entregas|materiales/download/  → duplicado de campus: el
│               admin revisa/descarga desde acá, bindea el mismo bucket R2
│
└── campus/                → Worker "home-campus" — campus.siendohome.com
    └── src/app/
        ├── (campus)/      → Todo el campus del alumno, protegido por sesión
        │   ├── dashboard/ → Stats, próxima sesión, continuar clase
        │   ├── cursos/    → Lista de cursos, detalle, reproductor de clase
        │   ├── calendario/→ Sesiones sincrónicas + Google Calendar
        │   ├── comunidad/ → Foro por curso (posts y respuestas)
        │   └── perfil/    → Datos personales, contraseña
        └── api/
            ├── entregas|materiales/download/
            └── google-calendar/    → connect/callback/disconnect (OAuth)

packages/
├── services/              → @home/services — toda la lógica compartida
│   └── src/
│       ├── supabase/server.ts      → createClient() para Server Components
│       ├── supabaseClient.ts       → cliente browser (admin panel)
│       ├── entregasStorage.ts, materialStorage.ts, googleCalendar.ts,
│       │   calendarSync.ts, roleService.ts, supabaseRest.ts, ...
│       └── siteUrls.ts             → CAMPUS_URL / MARKETING_URL
└── db-types/               → @home/db-types — database.types.ts, submissions.ts

supabase/
└── migrations/
    └── 000000_init.sql    → Schema unificado completo
```

Cada app tiene su propio `package.json`, `next.config.js`, `wrangler.jsonc` y
`.env.local` — se despliegan como dos Workers separados pero comparten el
mismo proyecto de Supabase (y los mismos buckets R2) como backend común.

---

## Setup local

### Requisitos

- Node.js 18+
- Proyecto Supabase creado

### Instalación

Un solo `npm install` en la raíz instala las dos apps y los dos paquetes
compartidos (es un workspace de npm — `apps/*` y `packages/*`).

```bash
npm install
```

Cada app necesita su **propio** `.env.local` (no hay uno solo en la raíz).

`apps/marketing/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # lo usa /admin/calendario al sincronizar

# URLs de la otra app — en local son los puertos de dev (ver abajo)
NEXT_PUBLIC_MARKETING_URL=http://localhost:3000
NEXT_PUBLIC_CAMPUS_URL=http://localhost:3001

# Opcional — reseñas de Google en la landing
GOOGLE_PLACES_API_KEY=<api-key>
NEXT_PUBLIC_GOOGLE_PLACE_ID=<place-id>

# Opcional — Google Calendar del alumno (ver esa sección más abajo).
# El OAuth en sí corre en campus, pero la sincronización disparada desde
# /admin/calendario también necesita estas dos.
GOOGLE_OAUTH_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=<client-secret>
```

`apps/campus/.env.local` — mismo `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`,
`GOOGLE_OAUTH_CLIENT_ID/SECRET` y las dos URLs (invertidas), sin las variables de Google Places (son sólo de la landing).

> **Nunca** pongas la `service_role` key ni el client secret de Google en variables `NEXT_PUBLIC_*` — solo la anon key es pública.

Con eso, correr las dos apps a la vez desde la raíz:

```bash
npm run dev
# marketing → http://localhost:3000
# campus    → http://localhost:3001
```

O una sola app (por ejemplo si solo estás tocando el campus):

```bash
npm run dev:marketing   # sólo :3000
npm run dev:campus      # sólo :3001
```

---

## Base de datos

### Aplicar el schema

Todo el schema, funciones, RLS y seed de configuración están en un único archivo:

```
supabase/migrations/000000_init.sql
```

**Pasos:**

1. Ir a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor**
2. Abrir `supabase/migrations/000000_init.sql`, pegar el contenido completo
3. Ejecutar

El archivo es idempotente: usa `IF NOT EXISTS`, `CREATE OR REPLACE` y `ON CONFLICT DO NOTHING`, por lo que es seguro ejecutarlo más de una vez.

### Seed de datos de prueba

Para poblar la base con datos de ejemplo (cursos, alumnos, ciclos, sesiones, progreso, foro):

```
supabase/seed.sql
```

Ejecutar de la misma forma desde el SQL Editor.

> **Importante:** el bloque `DO $$` al final del seed intenta inscribir automáticamente al primer admin/sysadmin que tenga `user_id` seteado. Si no aparecen datos en el campus tras ejecutar el seed, ver la sección [Vincular admin al campus](#vincular-admin-al-campus).

### Vincular admin al campus

El campus muestra datos basados en `enrollments`. Si tu usuario admin no tiene una inscripción, el campus aparecerá vacío.

Para comprobarlo y arreglarlo:

```sql
-- 1. Ver si tu usuario tiene perfil vinculado
SELECT id, email, role, user_id IS NOT NULL AS vinculado
FROM public.profiles
WHERE email = 'tu@email.com';

-- 2. Si user_id es NULL, vincularlo
UPDATE public.profiles
SET user_id = (SELECT id FROM auth.users WHERE email = 'tu@email.com')
WHERE email = 'tu@email.com';

-- 3. Ver enrollments existentes del perfil
SELECT e.id, c.name AS ciclo, co.title AS curso
FROM public.enrollments e
JOIN public.cycles c ON c.id = e.cycle_id
LEFT JOIN public.courses co ON co.id = c.course_id
WHERE e.user_id = (SELECT id FROM public.profiles WHERE email = 'tu@email.com');
```

---

## Roles y permisos

| Rol | Acceso |
|---|---|
| `student` (default) | Solo campus: `/dashboard`, `/cursos`, `/calendario`, `/comunidad`, `/perfil` |
| `admin` | Panel admin completo |
| `sysadmin` | Ídem admin — rol de super usuario |

Los roles se gestionan en la columna `profiles.role`.

**Promover un usuario a admin:**

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'staff@tu-dominio.com';
```

**Cómo funciona internamente:**

- `is_staff()` — función SECURITY DEFINER que lee `profiles.role` y devuelve `true` si es admin/sysadmin. Todas las políticas RLS de staff la usan.
- `get_my_profile_id()` — resuelve `auth.uid()` → `profiles.id`. Necesaria porque `lesson_progress` y `forum_posts` usan `profiles.id` como FK, no `auth.uid()`.
- `handle_new_user()` — trigger en `auth.users` que crea automáticamente el perfil al registrarse.
- `prevent_profile_privilege_escalation()` — trigger en `profiles` que impide que un alumno cambie su propio rol.

---

## Verificación completa

### 1. Typecheck

```bash
npm run typecheck
# o por separado: npm run typecheck:marketing / npm run typecheck:campus
```

Sin output = 0 errores.

### 2. Build

```bash
npm run build
# o por separado: npm run build:marketing / npm run build:campus
```

Debe completar sin errores en las dos apps.

### 3. Panel de administración

En `http://localhost:3000/admin` (Worker de marketing), iniciar sesión con una cuenta de rol `admin` o `sysadmin`.

| Sección | Qué verificar |
|---|---|
| **Resumen** | Stats en tiempo real (pendientes, alumnos activos, próximos ciclos). Si todo es 0, revisar que el perfil tenga `user_id` vinculado y rol staff. |
| **Admisiones** | Lista de `form_submissions`. Aprobar → confirmar → asignar ciclo → estado pasa a `enrolled`. |
| **Alumnos** | Lista de perfiles. Modal de detalle muestra enrollments, asistencia e historial. |
| **Calendario** | CRUD de ciclos y sesiones. Crear ciclo → agregar sesiones → verificar que aparecen. |
| **Cursos LMS** | Crear curso → módulo → clase con URL YouTube → vincular ciclo al curso. |

### 4. Campus (vista alumno)

Worker de campus, `http://localhost:3001`. Requisitos: usuario con perfil, al
menos un enrollment activo. El login sigue haciéndose en marketing
(`localhost:3000/auth/login`) — sin sesión, campus redirige para allá solo.

| Página | URL | Qué verificar |
|---|---|---|
| **Dashboard** | `/dashboard` | Nombre del alumno, cursos activos, clases completadas, próxima sesión, "Continuar Aprendiendo". |
| **Cursos** | `/cursos` | Lista los cursos de los ciclos en los que está inscripto. |
| **Detalle curso** | `/cursos/:id` | Muestra módulos y clases con porcentaje de progreso. |
| **Clase** | `/cursos/:courseId/:lessonId` | Video embebido. "Marcar como completada" guarda en `lesson_progress`. Recargar → estado persiste. |
| **Calendario** | `/calendario` | Sesiones del alumno. Sesiones pasadas muestran badge de asistencia. |
| **Comunidad** | `/comunidad` | Posts del foro. Crear post → aparece al instante. Responder → se guarda. |
| **Perfil** | `/perfil` | Editar nombre/teléfono/bio → guardar → recargar → persiste. Cambiar contraseña (mínimo 6 caracteres). |

**SSO entre las dos apps:** loguearse en `localhost:3000/auth/login` como
alumno tiene que mandar directo a `localhost:3001/dashboard` sin pedir login
de nuevo ahí. En local, como ambas corren en `localhost` (sólo cambia el
puerto), el cookie de sesión ya se comparte sin configurar nada — el
`NEXT_PUBLIC_COOKIE_DOMAIN` sólo hace falta en producción, entre subdominios
reales.

### 5. API de reseñas

```bash
curl http://localhost:3000/api/reviews
# → { data: [...] }
```

Si retorna `{ error: "Google Places API credentials are not configured." }`, las variables `GOOGLE_PLACES_API_KEY` y `NEXT_PUBLIC_GOOGLE_PLACE_ID` no están configuradas.

### 6. Verificar RLS con SQL

```sql
-- Ver todas las políticas activas
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Confirmar que is_staff() funciona (ejecutar autenticado como admin)
SELECT public.is_staff();   -- debe retornar true

-- Confirmar que get_my_profile_id() devuelve un UUID (ejecutar autenticado como alumno)
SELECT public.get_my_profile_id();
```

---

## Deploy

Dos Workers separados — hay que deployar cada uno desde su carpeta (o con
`--workspace` desde la raíz). Requiere `wrangler` autenticado (`npx wrangler login`).

```bash
npm run deploy --workspace=marketing   # Worker "home-experience" → siendohome.com
npm run deploy --workspace=campus      # Worker "home-campus" → campus.siendohome.com
```

**Preview local con worker real** (uno u otro, no ambos en la misma terminal):

```bash
npm run preview --workspace=marketing
npm run preview --workspace=campus
```

**Build Next.js estándar** (sin Cloudflare, por app):

```bash
npm run build --workspace=marketing && npm run start --workspace=marketing
npm run build --workspace=campus && npm run start --workspace=campus
```

---

## Google Calendar del alumno

El alumno conecta su cuenta desde `/calendario` y las jornadas de sus ciclos y
cursos le aparecen agendadas. Es opcional: sin configurar, la tarjeta muestra
"la integración todavía no está habilitada" y el resto del campus funciona igual.

### 1. Proyecto en Google Cloud

En [console.cloud.google.com](https://console.cloud.google.com):

1. Crear un proyecto (o usar el existente).
2. **APIs y servicios → Biblioteca** → habilitar **Google Calendar API**.

### 2. Pantalla de consentimiento

**APIs y servicios → Pantalla de consentimiento de OAuth**, tipo **Externo**.

Scopes a agregar — son exactamente los que pide `buildConsentUrl()`:

| Scope | Para qué |
|---|---|
| `openid` | Que Google devuelva el `id_token`. Sin esto no sabemos qué cuenta conectó |
| `email` | Mostrarle al alumno con qué cuenta quedó conectado |
| `.../auth/calendar.events` | Crear y editar los eventos de las jornadas |

`calendar.events` es un scope **sensible**. Mientras la app esté en modo
*Testing* hay tope de 100 usuarios y cada alumno ve la pantalla de "Google no
verificó esta app" (puede seguir con *Configuración avanzada → Ir a…*). Para
sacarla hay que publicar la app y pasar la verificación de Google, que pide
video del flujo y justificación del scope. Se tarda semanas: conviene arrancar
en *Testing* con los alumnos cargados como usuarios de prueba.

### 3. Cliente OAuth

**Credenciales → Crear credenciales → ID de cliente de OAuth**, tipo
**Aplicación web**. En **URI de redireccionamiento autorizados** cargar, tal
cual — son del Worker de **campus**, no del de marketing, porque ahí es
donde vive `/calendario` y el botón de conectar:

```
http://localhost:3001/api/google-calendar/callback
https://campus.siendohome.com/api/google-calendar/callback
```

La ruta la arma `redirectUri()` a partir del `origin` del request, así que la
URI tiene que coincidir carácter por carácter con el host por el que entra el
alumno. Si el campus también responde en `www.campus.siendohome.com`, va como
una tercera URI: para Google es otro host.

No hace falta cargar "orígenes de JavaScript autorizados": el intercambio del
code por tokens es server-side.

### 4. Variables

Local, en `.env.local` de **las dos apps** (ver [Setup local](#setup-local) —
`calendarSync.ts` corre tanto desde `/admin/calendario` en marketing como
desde el flujo de conexión en campus):

```env
GOOGLE_OAUTH_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=<client-secret>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Producción — son secretos, **no** van en `wrangler.jsonc`. Hay que cargarlos
en **los dos Workers** (`--cwd` apunta al `wrangler.jsonc` de cada uno):

```bash
npx wrangler secret put GOOGLE_OAUTH_CLIENT_ID --cwd apps/marketing
npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET --cwd apps/marketing
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --cwd apps/marketing

npx wrangler secret put GOOGLE_OAUTH_CLIENT_ID --cwd apps/campus
npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET --cwd apps/campus
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --cwd apps/campus
```

`SUPABASE_SERVICE_ROLE_KEY` la necesita `calendarSync.ts` para escribir en
`google_calendar_accounts`, que a propósito no es legible ni escribible desde
el cliente (RLS sin políticas + `REVOKE`). El alumno consulta su estado por
`my_google_calendar_status()`.

### 5. Migración

```bash
supabase db push   # 000003_google_calendar_sync.sql
```

### 6. Probar

1. Entrar al campus como alumno → **Calendario** → *Conectar Google Calendar*.
2. Aceptar todos los pasos del consentimiento (si se saltea el de calendario,
   Google no manda `refresh_token` y vuelve con `?gcal=no_refresh_token`).
3. Vuelve a `/calendario?gcal=connected&eventos=N`.

Si algo falla, la vuelta trae el motivo en el query param:

| `?gcal=` | Qué pasó |
|---|---|
| `connected` | Listo, con `eventos=N` sincronizados |
| `not_configured` | Faltan `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` |
| `cancelled` | El alumno canceló en la pantalla de Google |
| `invalid_state` | La cookie de state venció (10 min) o no coincide |
| `no_refresh_token` | Google no mandó refresh token; reintentar aceptando todo |
| `no_profile` | El usuario de auth no tiene fila en `profiles` |
| `error` | Falló el intercambio o la carga inicial — ver logs del worker |

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Sí** | URL del proyecto Supabase — igual en las dos apps |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Sí** | Anon key pública (safe to expose) — igual en las dos apps |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí** | Alta de alumnos, sincronización con Google Calendar — en las dos apps |
| `NEXT_PUBLIC_MARKETING_URL` | **Sí** | Origin del sitio principal (`https://siendohome.com` en prod). Usada por `@home/services/siteUrls` para armar links/redirects hacia marketing desde campus |
| `NEXT_PUBLIC_CAMPUS_URL` | **Sí** | Origin del campus (`https://campus.siendohome.com` en prod). Misma idea, en sentido contrario |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | No | Sólo en producción: `.siendohome.com`. Hace que el cookie de sesión de Supabase se comparta entre los dos subdominios (SSO). Vacío en local — no hace falta entre puertos de `localhost` |
| `NEXT_PUBLIC_BASE_URL` | No | Base del link de invitación por mail. Sin ella se usa el `origin` del request |
| `GOOGLE_OAUTH_CLIENT_ID` | No | OAuth del Google Calendar del alumno — ver [sección](#google-calendar-del-alumno). En las dos apps |
| `GOOGLE_OAUTH_CLIENT_SECRET` | No | Idem. Secreto: nunca en `wrangler.jsonc` ni en `NEXT_PUBLIC_*` |
| `GOOGLE_PLACES_API_KEY` | No | Clave server-side para el proxy de reseñas — sólo marketing |
| `NEXT_PUBLIC_GOOGLE_PLACE_ID` | No | Place ID del negocio en Google Maps — sólo marketing |

> **Nunca** en `NEXT_PUBLIC_*`: la `service_role` key y el client secret de OAuth. Todo lo que lleve ese prefijo termina en el bundle del navegador.

> Casi todo el acceso privilegiado se resuelve con funciones `SECURITY DEFINER` en Postgres. La `service_role` key queda para lo que no puede: crear usuarios en `auth.users` y escribir en `google_calendar_accounts`, que no es accesible desde el cliente.

---

## Arquitectura de datos clave

```
auth.users
    │
    └─▶ profiles (user_id FK)
            │
            └─▶ enrollments (user_id → profiles.id)
                    │
                    ├─▶ cycles (cycle_id) ──▶ courses (course_id)
                    │       └─▶ cycle_sessions
                    │               └─▶ attendance (enrollment_id)
                    │
                    ├─▶ weekly_checkins
                    └─▶ student_goals

courses ──▶ modules ──▶ lessons ──▶ lesson_resources
                                └─▶ lesson_progress (user_id → profiles.id)
                                └─▶ forum_posts     (user_id → profiles.id)
```

**Nota importante:** `lesson_progress.user_id` y `forum_posts.user_id` apuntan a `profiles.id` (UUID generado), **no** a `auth.uid()`. Por eso existe `get_my_profile_id()` — sin ella todas las políticas RLS de progreso y foro fallarían silenciosamente.
