# HOME Experience — Campus & Admin

> Plataforma educativa para el programa CRESER de coaching ontológico.  
> Campus virtual para alumnos + panel de gestión para staff.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres + Auth + RLS) · Cloudflare Pages (OpenNext) · Tailwind CSS · Framer Motion

---

## Índice

- [Estructura del proyecto](#estructura-del-proyecto)
- [Setup local](#setup-local)
- [Base de datos](#base-de-datos)
- [Roles y permisos](#roles-y-permisos)
- [Verificación completa](#verificación-completa)
- [Deploy](#deploy)
- [Variables de entorno](#variables-de-entorno)

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (public)/          → Landing pública (testimonios, formulario CRESER)
│   ├── (campus)/          → Campus del alumno — protegido por sesión
│   │   ├── _components/   → CampusSidebar, CampusTopbar
│   │   ├── dashboard/     → Stats, próxima sesión, continuar clase
│   │   ├── cursos/        → Lista de cursos, detalle, reproductor de clase
│   │   ├── calendario/    → Sesiones sincrónicas + asistencia
│   │   ├── comunidad/     → Foro por curso (posts y respuestas)
│   │   └── perfil/        → Datos personales, info médica, contraseña
│   ├── admin/             → Panel de gestión (protegido por rol staff)
│   ├── auth/              → Login, recuperar contraseña
│   └── api/
│       └── reviews/       → Proxy a Google Places API (server-side)
├── features/
│   └── dashboard/
│       └── admin/         → AdminAdmissions, AdminStudents, AdminCalendar, AdminCourses
├── services/
│   └── supabaseClient.ts  → Cliente browser singleton (admin panel)
└── utils/supabase/
    ├── client.ts          → createClient() para campus (browser)
    └── server.ts          → createClient() para Server Components (SSR)

supabase/
└── migrations/
    └── 000000_init.sql    → Schema unificado completo
```

---

## Setup local

### Requisitos

- Node.js 18+
- Proyecto Supabase creado

### Instalación

```bash
npm install
```

Crear `.env.local` en la raíz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Opcional — reseñas de Google en la landing
GOOGLE_PLACES_API_KEY=<api-key>
NEXT_PUBLIC_GOOGLE_PLACE_ID=<place-id>
```

> **Nunca** pongas la `service_role` key en variables `NEXT_PUBLIC_*` — solo la anon key es pública.

```bash
npm run dev
# → http://localhost:3000
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
npx tsc --noEmit
```

Sin output = 0 errores.

### 2. Build

```bash
npm run build
```

Debe completar sin errores.

### 3. Panel de administración

Ir a `/admin` e iniciar sesión con una cuenta de rol `admin` o `sysadmin`.

| Sección | Qué verificar |
|---|---|
| **Resumen** | Stats en tiempo real (pendientes, alumnos activos, próximos ciclos). Si todo es 0, revisar que el perfil tenga `user_id` vinculado y rol staff. |
| **Admisiones** | Lista de `form_submissions`. Aprobar → confirmar → asignar ciclo → estado pasa a `enrolled`. |
| **Alumnos** | Lista de perfiles. Modal de detalle muestra enrollments, asistencia e historial. |
| **Calendario** | CRUD de ciclos y sesiones. Crear ciclo → agregar sesiones → verificar que aparecen. |
| **Cursos LMS** | Crear curso → módulo → clase con URL YouTube → vincular ciclo al curso. |

### 4. Campus (vista alumno)

Requisitos: usuario con perfil, al menos un enrollment activo.

| Página | URL | Qué verificar |
|---|---|---|
| **Dashboard** | `/dashboard` | Nombre del alumno, cursos activos, clases completadas, próxima sesión, "Continuar Aprendiendo". |
| **Cursos** | `/cursos` | Lista los cursos de los ciclos en los que está inscripto. |
| **Detalle curso** | `/cursos/:id` | Muestra módulos y clases con porcentaje de progreso. |
| **Clase** | `/cursos/:courseId/:lessonId` | Video embebido. "Marcar como completada" guarda en `lesson_progress`. Recargar → estado persiste. |
| **Calendario** | `/calendario` | Sesiones del alumno. Sesiones pasadas muestran badge de asistencia. |
| **Comunidad** | `/comunidad` | Posts del foro. Crear post → aparece al instante. Responder → se guarda. |
| **Perfil** | `/perfil` | Editar nombre/teléfono/bio → guardar → recargar → persiste. Cambiar contraseña (mínimo 6 caracteres). |

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

**Cloudflare Pages (producción):**

```bash
npm run deploy
```

Requiere `wrangler` autenticado (`npx wrangler login`).

**Preview local con worker:**

```bash
npm run preview
```

**Build Next.js estándar:**

```bash
npm run build && npm run start
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Sí** | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Sí** | Anon key pública (safe to expose) |
| `GOOGLE_PLACES_API_KEY` | No | Clave server-side para el proxy de reseñas |
| `NEXT_PUBLIC_GOOGLE_PLACE_ID` | No | Place ID del negocio en Google Maps |

> La `service_role` key de Supabase no es necesaria en esta app — todas las operaciones privilegiadas se hacen mediante funciones `SECURITY DEFINER` en Postgres.

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
