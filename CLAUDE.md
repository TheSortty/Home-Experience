# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

HOME Experience is two things:

- A campus LMS for the CRESER coaching program. Its programs are Inicial → Avanzado → PL (Plan Líder), plus Formación.
- A staff admin panel with a CRM.

UI text, code comments and commit messages are in **Spanish (rioplatense)**. Keep them that way. The staff who use the admin panel are not technical, so UI copy should be plain Spanish, not dev jargon. The same applies when writing user-facing release notes.

**Read `CONSTRAINTS.md` before changing code.** Run `npm run check:fast` while editing, `check:task` before calling a task done, and `check:full` before any push. Never weaken a constraint (allowlists, `.gitleaksignore`, depcruise rules, size limits, new `@ts-ignore`/`as any`) to make a change pass; ask instead.

## Commands

```bash
npm install                 # once, at the root (npm workspaces: apps/*, packages/*)
npm run dev                 # both apps: marketing :3000, campus :3001
npm run dev:campus          # one app only (also dev:marketing)
npm run typecheck           # both apps; typecheck:marketing / typecheck:campus
npm run build               # next build of both; build:marketing / build:campus
```

- **Verification:** there are no tests and no working lint (`next lint` was removed in Next 16, and there is no ESLint config). Typecheck plus build of the app you touched is the verification. If you change `packages/services`, check both apps.
- **Environment variables:** each app has its own `.env.local` (see README "Setup local"). Login only exists in marketing. Campus redirects there, and the session cookie is shared across subdomains through `NEXT_PUBLIC_COOKIE_DOMAIN`.
- **Dev machine:** Windows with Git Bash and PowerShell. `python` in PowerShell is Python 3.14, but it isn't on the Git Bash PATH, so prefer Node (v24 runs `.ts`/`.mts` directly) for helper scripts. Scratch scripts belong in the session scratchpad, not in the repo.

## Deploy — a push is a production release

**Every push to `main` deploys to production.** Cloudflare Workers Builds, configured in the Cloudflare dashboard (not in this repo), rebuilds both Workers on each push:

- `home-experience`: `apps/marketing`, serves siendohome.com and /admin.
- `home-campus`: `apps/campus`, serves campus.siendohome.com.

A deploy takes about 1–3 minutes. `npx wrangler deployments list`, run inside an app folder, shows the latest one. So:

- Only push when the user asks.
- Typecheck and build before pushing.
- Push code that depends on a new migration only after the user confirms they ran it.

`npm run deploy --workspace=<app>` is a manual fallback; don't use it routinely.

Each deploy changes the chunk hashes, and tabs that are already open can hit a ChunkLoadError. `packages/services/src/chunkError.ts`, used by every `error.tsx`, reloads the page once when that happens. Don't remove it.

## Architecture

npm-workspaces monorepo. Both apps run Next.js 16 App Router on Cloudflare Workers through `@opennextjs/cloudflare`. They share one Supabase project and the same R2 buckets (bindings `AVATARS` and `ENTREGAS`), which is why the download routes exist in both apps.

- **`apps/marketing`**: public landing, `/auth/*`, and the staff panel `/admin/*`.
  - Newer admin pages live in `src/app/admin/(shell)/*`, with their feature components in `src/features/admin/*`.
  - Older ones live in `src/features/dashboard/admin/*`. This includes `StudentDetailModal.tsx`, the per-person file (~1900 lines).
  - The LMS admin is in `src/app/admin/lms`.
- **`apps/campus`**: the student area, `src/app/(campus)/*` (dashboard, cursos, clase, calendario, comunidad, perfil). Mostly Server Components plus server actions (for example `cursos/actions.ts`).
- **`packages/services`** (`@home/services/*`): all shared logic. Import it as `@home/services/<file>`; the `exports` map points straight at `src/*.ts`, with no build step. Check here before writing a helper.
- **`packages/db-types`**: `database.types.ts`, the generated Supabase types. They can lag behind the migrations, so check the migration SQL when a column is missing.

### Data access: two patterns

- **Server Components and server actions** use `createClient()` and `getSessionUser()` from `@home/services/supabase/server`.
  - supabase-js in Workers can throw Cloudflare Error 1101 ("Cannot perform I/O on behalf of a different request").
  - That is why campus layout and pages wrap role and profile lookups in try/catch with safe defaults. Keep that pattern.
  - See `docs/TECH_DEBT.md` item [C].
- **Admin panel client components** use `@home/services/supabaseRest` (`restSelect`, `restInsert`, `restBulkInsert`, `restUpdate`, `restUpsert`, `restDelete`, `restRpc`).
  - It calls PostgREST directly and avoids supabase-js on purpose.
  - It runs in the browser only: it reads the user's JWT from `document.cookie` and uses the anon key, so **RLS always applies**. It is not a service-role client.
- **Admin page shape:** `page.tsx` is a server component that calls `await requireAdminPage()` from `@home/services/adminPageGuard`, then renders a `'use client'` `*Client.tsx`. Copy `personas/cargar/` or `personas/importar/`.
- **Activity feed:** staff actions are logged with `logEvent` (client) or `logEventServer` from `@home/services/activityEvents`. Use `getMyActorInfo()` for the current staff profile id.

### Roles and access

`profiles.role` is a single column with one of: `student`, `coach`, `admin`, `sysadmin`, `super_admin`.

- **Role checks:** always use the helpers in `roleService.ts` (`isAdminRole`, `isReviewerRole`, where reviewer means staff + coach). A literal `role === 'admin' || role === 'sysadmin'` check misses `super_admin`.
- **Middleware:** it gates `/admin` in marketing and requires a session in campus.
- **Database side:** RLS relies on `is_staff()` and `get_my_profile_id()`.
  - Most FKs point to `profiles.id`, not to `auth.uid()`. For example, `enrollments.user_id` is a profile id.
  - The trigger `trg_prevent_profile_escalation` blocks role changes unless the caller is staff. From the SQL Editor, change a role by disabling the trigger inside a transaction; `supabase/grant_admin_benincanicolas.sql` is the template.
- **LMS access:**
  - It comes only from `course_access(profile_id, course_id)`, through `resolveCourseAccess` / `hasCourseAccess` in `courseAccess.ts`.
  - Staff and coaches see every course.
  - Enrollments in cycles do **not** grant course access.
- **Campus role:**
  - `resolveCampusRole` treats an admin who has any `course_access` row as a `student` inside the campus: they only see their own courses and their progress is tracked. `/admin` still sees their real role.
  - Campus pages must pass this campus role, not the raw one, to access, progress and forum logic.
  - Staff get the "Ir a administración" link in the campus profile menu.

### CRM and data loading (admin → Personas)

Staff move Excel sheets and paper forms into the database here.

- **Core tables:**
  - `profiles`.
  - `profile_intake`: dreams, context, life history.
  - `medical_info`: confidential.
  - `enrollments`, which also carries:
    - `enrolled_by_name` (who invited the person to the program) and `channel`.
    - `agreed_amount`, `scholarship` (`none` / `half` / `full`) and `deal_notes` (promos such as "2x1", combos).
    - `drop_reason` and `extras` (jsonb).
  - `payments`, with `concept`, `period_month` and `notes`.
  - `profile_notes`: the dated "comentario interno" log.
  - `follow_ups`: one row per (profile, target program), with a status out of `contactar`, `sin_respuesta`, `duda`, `si`, `no`, `no_elegible`.
- **Balance ("a cobrar"):** `agreed_amount` minus paid `payments`. The view `enrollment_balances` computes it; don't store it.
- **Enrollment status:** `active`, `completed`/`graduated`, `dropped` or `conflict`. The UI shows `dropped` as "De baja".
- **Screens:**
  - `personas/cargar`: manual entry, one person at a time.
  - `personas/importar`: the Excel/CSV importer. Rows are staged in `import_staging_rows` and then applied. The logic is in `features/admin/personas/import/`:
    - `readXlsx.ts`: a dependency-free XLSX reader.
    - `sheetTable.ts`: detects title rows and sub-blocks (INICIAL / AVANZADO / PL), each with its own header.
    - `importFields.ts`: maps headers to fields; the longest matching alias wins.
    - `applyRow.ts`: does the writes, and matches existing people by email, then DNI, then first + last name.
  - `personas/seguimientos`: kanban over `follow_ups`.
- **Cycle types:** `initial`, `advanced`, `plan_lider` (these three are CRESER), `workshop`, `coaching`. Labels live in `CYCLE_TYPE_LABELS` in `features/admin/personas/types.ts`.

## Database and migrations

- **How they are applied:** migrations in `supabase/migrations/` are applied **by hand**. The user pastes them into the Supabase SQL Editor; there is no CLI pipeline or migration table.
- **After writing one:** tell the user to run it, and never assume it has been applied. Make every migration idempotent (`IF NOT EXISTS`, `DO $$ … pg_constraint` guards) and additive where possible. Never edit a migration that was already applied; add a new one.
- **RLS on new tables:** a new table needs its own `ENABLE ROW LEVEL SECURITY` plus a `staff_all_access` policy. The loop in `000000_init.sql` that applied it to every table ran only once.
- **Numbering:** there are two `000005_*` and two `000006_*` files. Leave them as they are.
- **PostgREST embeds:** `enrollments` must keep **exactly one** FK to `profiles` (`user_id`). A second one made bare embeds fail in production with PGRST201; migration `000008` fixed it. For tables with more than one FK to `profiles` (`follow_ups`, `course_access`), write the hint: `profiles!follow_ups_profile_id_fkey(...)`, `enrollments!enrollments_user_id_fkey(...)`.
- **One-off data fixes:** SQL for data changes (such as granting a role) goes in a standalone `supabase/*.sql` file, not in `migrations/`.

## UI conventions

- **Styling:** Tailwind.
  - The admin panel uses a slate palette with accent `#00A9CE`, rounded-xl cards, and small uppercase labels.
  - The campus uses its own tokens from `apps/campus/tailwind.config`: `terra`, `cream`, `ink`, `celeste-strong`, and others.
- **Libraries:** icons come from `react-icons/io5` and toasts from `react-hot-toast`. Don't add UI or animation libraries; native elements such as `<input type="date">` and `<select>` are preferred.
- **Release notes:** user-facing notes for staff live in `apps/marketing/src/data/changelog.ts`, shown at `/admin/novedades`. Write them in plain Spanish. `CHANGELOG.md` is an older, developer-facing log.

## Repo hygiene

- Don't commit `apps/*/next-env.d.ts`, which the build regenerates, or `codigo.txt` in the root.
- `stash@{0}` is an old WIP from before the split into two apps. Everything useful in it is already in `main`; don't pop it.
- Background docs:
  - `README.md`: setup, Google Calendar OAuth, env vars.
  - `docs/TECH_DEBT.md`.
  - `PENDING_REVIEW.md`: a snapshot from 2026-09-17, partly stale.
