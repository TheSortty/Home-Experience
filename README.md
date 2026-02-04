# HOME Experience

> "Gravity is just a suggestion."

Este repositorio concentra la experiencia pública de HOME y el **panel de administración de CRESER**. El objetivo es que el equipo pueda operar inscripciones, pagos, ciclos y asistencia sin pedir cambios de código.

## 🧭 Objetivo del sistema

- Formularios editables desde la admin (sin tocar código).
- Flujo de admisión → pago → asignación a ciclo.
- Etapas **INICIAL → AVANZADO → PL** (orden obligatorio).
- Asistencia por día de clase.
- Email automático para confirmaciones y avisos.

## 📌 Cómo entender el proyecto (resumen para juniors)

1. **Front-end**: la UI vive en `src/` y se organiza por features.
2. **Back-end**: se usa Supabase (tablas + funciones RPC) como backend.
3. **Admin**: cada pantalla del panel hace consultas directas a Supabase.
4. **Migraciones**: toda la estructura de la base está en `supabase/migrations`.
5. **Estado actual**: lo que funciona hoy y lo que falta está listado abajo.

## 🧱 Arquitectura (Feature-First)

```ascii
src/
├── core/           # Configuración global, tipos, lógica compartida
├── ui/             # Componentes atómicos (design system)
├── features/       # Vertical slices por feature
│   ├── landing/    # Landing pública
│   ├── auth/       # Login / registro
│   └── dashboard/  # Admin (lazy-loaded)
├── assets/         # Recursos estáticos
└── main.tsx        # Entrada
```

La admin consume Supabase y queda preparada para extenderse a panel de alumno (en PL).

## 🧠 Lógica del panel de administración

### Flujo ideal (CRESER)
1. **Formulario** editable → el usuario completa.
2. **Admin revisa** y aprueba admisión.
3. **Pago** se confirma (manual o MercadoPago).
4. **Enrollment** se crea y se asigna a un ciclo.
5. **Asistencia diaria** y avance por etapas (INICIAL → AVANZADO → PL).
6. **Panel alumno** habilitado en PL.

### Regla de asistencia
- Si falta **un día** de una etapa, **repite esa etapa**.
- No reinicia etapas anteriores (solo la que faltó).

## ✅ Qué está listo hoy

- **Admin UI**: tabs de admisiones, alumnos, calendario, formularios y settings.
- **Formularios editables**: `forms` + `form_submissions`.
- **Ciclos**: CRUD en admin (tabla `cycles`).
- **Testimonios**: moderación básica.
- **Base para pagos y sesiones**: migración para `payments`, `cycle_sessions`, `enrollments`.

## 🧩 Qué falta completar

- **Pagos reales** (MercadoPago/transferencia manual).
- **Asignación automática de combos** (crear enrollment pendiente si no hay ciclo).
- **Asistencia diaria** (usar `cycle_sessions` + `attendance`).
- **Emails automáticos** (plantillas + triggers).
- **Login alumno** (habilitar acceso al finalizar PL).

## 🔌 Endpoints / conexiones reales (Supabase)

> No hay un backend tradicional con rutas REST. Las “llamadas” son **consultas directas a tablas** o **RPC/Edge Functions** de Supabase.

### Tablas consumidas por la app

| Pantalla / Feature | Tabla(s) |
| --- | --- |
| Admin Dashboard | `form_submissions`, `enrollments` |
| Admisiones | `form_submissions`, `cycles`, RPC `confirm_submission_enrollment` |
| Alumnos | `profiles`, `enrollments`, `student_goals` |
| Calendario | `cycles`, `enrollments` |
| Formularios | `forms`, `form_submissions` |
| Testimonios | `testimonials` |
| Landing (testimonios) | `testimonials` |
| Site settings | `site_settings` |

### RPC / Edge Functions

- `confirm_submission_enrollment` → confirma inscripción + crea enrollment.
- `send-email` → envío de emails automáticos (inscripción, bienvenida, etc.).

## 🧱 Estructura de base (resumen)

- `forms` / `form_submissions`: formulario editable CRESER.
- `profiles`: datos personales (futuro login real).
- `payments`: pagos manuales o MercadoPago.
- `cycles` + `cycle_sessions`: fechas reales de cursada.
- `enrollments`: estado por etapa.
- `attendance`: asistencia diaria.

## 🗄️ Base de datos

Las migraciones viven en `supabase/migrations` y se consolidaron en un único archivo (`000000_init.sql`). Para pruebas con permisos abiertos existe `000001_open_access.sql` (NO usar en producción). La documentación actualizada del modelo está en `database-schema.md`.

El flujo clave se apoya en:

- `forms` / `form_submissions` (formulario CRESER único).
- `payments` (pagos manuales y MercadoPago).
- `cycles` + `cycle_sessions` (fechas reales de cursada).
- `enrollments` (estado por etapa + progreso).
- `attendance` (asistencia por sesión).

## 🛠️ Instalación local

### Requisitos
- Node.js 18+
- NPM 9+

### Pasos
```bash
npm install
npm run dev
```

La app queda en `http://localhost:3000`.

## 💳 Guía rápida para links de MercadoPago

1. Entrar a [mercadopago.com.ar](https://www.mercadopago.com.ar).
2. Ir a **Link de pago** → **Crear nuevo link**.
3. Crear uno por combo o etapa.

Ejemplos:
- **Combo 1**: `Inscripción CRESER - Combo 1` → `$480.000`
- **Combo 2**: `Inscripción CRESER - Combo 2` → `$740.000`
- **Inicial**: `$190.000`
- **Avanzado**: `$230.000`
- **Liderazgo**: `$350.000`

## 🚀 Deploy

**Cloudflare Pages**
- Framework: `Vite`
- Build: `npm run build`
- Output: `dist`

**Pterodactyl**
- Startup:
  ```bash
  npm install && npm run build && npm run preview -- --host 0.0.0.0 --port {{SERVER_PORT}}
  ```

---

*Documento único del proyecto.*
