# Pendientes de revisión — panel de Administración

Este archivo resume el estado después de la sesión de rediseño del panel admin
del 2026-09-16/17. Todo lo de esa sesión ya está commiteado y pusheado a
`origin/main` (commit `43a3de8` en adelante). Lo que queda acá es lo que
**no** se terminó, para que otra instancia de Claude Code lo retome sin tener
que releer toda la conversación.

## 🔴 Urgente: conflicto sin resolver en un stash local

Antes de pushear, hubo que traer 3 commits que ya estaban en `origin/main`
(uno de ellos, de otra sesión de Claude, arregla el mismo bug de "marcar como
leído" que se tocó hoy — se resolvió bien, quedó lo mejor de las dos
versiones). Pero **había trabajo sin commitear de otra tanda** (no de esta
sesión) que no se pudo reconciliar automáticamente contra lo que vino del
remoto, así que quedó guardado en un `git stash` en vez de perderse.

```
git stash list
# stash@{0}: On main: pre-existing WIP unrelated to this session
#            (entregas file picker, personas import, crm staging, etc.)
```

**Qué hay ahí adentro** (21 archivos, `git stash show -u stash@{0} --stat`):
- Feature de **importar histórico de Personas** completa y sin commitear:
  `src/app/admin/(shell)/personas/importar/` (ImportarClient.tsx + page.tsx),
  `src/features/admin/personas/import/importFields.ts`.
- Migraciones de un **schema de CRM/staging** aparte del que se tocó hoy:
  `supabase/migrations/000005_crm_schema.sql` y `000006_crm_import_staging.sql`.
  (Ojo: es un CRM distinto al tab "CRM" que se eliminó de la ficha del
  alumno hoy — coincidencia de nombre, no está relacionado.)
- Cambios de compresión/tipos de archivo para entregas:
  `src/utils/imageCompress.ts`, `src/services/entregasFileTypes.ts`,
  `src/utils/fileAccept.ts`, `src/services/entregasStorage.ts`.
- **Conflicto real**: `SubmissionTab.tsx`, `ReviewForm.tsx` y
  `SubmissionCard.tsx` (entregas) tienen cambios en el stash que pisan los
  mismos archivos que el commit `5677225` (ya en remoto, "picker de archivos
  en Android"). Se resolvió el conflicto de forma segura devolviendo esos 3
  archivos a la versión ya mergeada (`git checkout HEAD -- <archivo>`), así
  que **el working tree está limpio ahora mismo**, pero eso significa que el
  cambio del stash para esos 3 archivos específicamente **no se aplicó** —
  sigue esperando en el stash, intacto.
- Otros cambios menores: `package.json`/`package-lock.json` (dependencia
  nueva), `database.types.ts` (tipos regenerados, probablemente por las
  migraciones de arriba), `next-env.d.ts`, `google-calendar/callback/route.ts`,
  `admin/lms/actions.ts`, y `codigo.txt` (un archivo suelto en la raíz, no
  quedó claro para qué es).

**Qué hacer**: alguien que conozca esa feature de importación/CRM staging
tiene que hacer `git stash pop` (o `git stash apply` para no perderlo si
vuelve a fallar) y resolver a mano el conflicto de esos 3 archivos de
entregas — decidiendo si el cambio del stash ahí sigue haciendo falta después
del fix de Android que ya está en main, o si ya quedó incluido.

## ✅ Lo que se hizo hoy (ya en main)

1. **Shell de admin**: sidebar retráctil a riel de íconos, se sacó el
   buscador global del topbar y la sección "Comunicación" (mockup sin
   funcionalidad). El título de sección se movió del contenido al header fijo.
2. **Personas y Programas**: buscador propio por sección, tabla de alumnos
   simplificada (sin Asistencia/Pago en la vista rápida, "+ Programa" solo si
   no tiene ninguno asignado), responsive arreglado.
3. **Ficha del alumno**: de 11 pestañas planas (4 grupos, con "CRM" y
   "Sysadmin" como conceptos separados) a 2 grupos (Perfil / Programas, con
   Plan Líder anidado dentro de Historial de Programas). Se sacó la
   duplicación real entre "Perfil & Contacto" (mostraba una copia congelada
   del formulario original) y el tab CRM (los campos editables de verdad).
   Header nuevo con avatar + stats. Cachea qué pestaña ya se cargó por
   alumno para que no se vuelva a pedir todo al servidor al cambiar de tab.
4. **Actividad**: de un feed único con filtros a 5 bloques por categoría, a
   alto fijo (3 items c/u), con buscador de persona por autocompletar (en vez
   de filtrar texto libre sobre lo cacheado).
5. **Login**: arreglado el loop de redirección entre `/auth/login` y
   `/admin/dashboard` (chequeo de sesión duplicado y desincronizado entre
   cliente y servidor).

## 🟡 Cosas que quedaron explícitamente pendientes / a confirmar con el usuario

Estas surgieron en la conversación pero el usuario pidió esperar antes de
tocarlas, o quedaron fuera de alcance:

- **Auditoría vs Actividad**: `AdminLogs`/Auditoría lee de una tabla vieja
  `activity_logs`, separada del sistema `staff_activity_events` que usa
  Actividad. Se decidió **no tocarlo todavía** — es un cambio de fondo
  (unificar datos), no de diseño.
- **Vista mosaico (grid) de Personas**: el fix de "+ Programa solo si no
  tiene ningún programa" se aplicó a la vista tabla; la vista mosaico y
  Coaches quedaron sin ese mismo criterio — el usuario dijo que avisaría si
  también lo quería ahí.
- **Simplificar headers de otras secciones**: se sacó el título/breadcrumb
  redundante del shell (afecta a todas las secciones por ser código
  compartido) y se limpió el header propio de Actividad. Personas y
  Programas todavía tienen su propio `<h1>` + descripción en el contenido —
  el usuario dijo que evaluaría si le gustaba el cambio en Actividad antes de
  pedir lo mismo en el resto.
- **Puntos del pedido original que no se llegaron a tocar**: Calendario
  (unificar admin + campus, modo "comunidad"), Inscripciones (margen de
  mejora, sin definir qué exactamente), Programas (pulido visual más allá de
  lo responsive), Novedades/changelog (mantenerlo actualizado — es más un
  tema de proceso que de código).

## Cómo verificar que todo compila

```
npx tsc --noEmit -p tsconfig.json
```

Debería salir limpio (sin contar ruido preexistente de `.next/types` si el
dev server no se reinició después de borrar la ruta de Comunicación).
