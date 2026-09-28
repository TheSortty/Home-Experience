# CONSTRAINTS.md

El piso de calidad de este repo. Lo definió el dueño del proyecto el 2026-09-27;
los agentes lo cumplen y **nunca lo bajan** para que un cambio pase (ver
"Guardia"). Si un número está mal, se cambia acá con su razón, no en silencio.

Herramientas: `gitleaks` (winget `Gitleaks.Gitleaks`), `dependency-cruiser` y
`size-limit` (devDependencies de la raíz). No hay tests ni lint: el proyecto no
los tiene, y no se inventa un gate que no existe.

## Cuándo corre cada cosa

| Momento | Comando | Tarda | Qué incluye |
|---|---|---|---|
| Mientras se edita | `npm run check:fast` | ~6 s | secretos + arquitectura |
| Al terminar una tarea (antes de dar por hecho o commitear) | `npm run check:task` | ~25 s | lo anterior + typecheck de las dos apps |
| Antes de pushear (push = producción) | `npm run check:full` | ~1 min | lo anterior + build de las dos apps + tamaño del bundle + secretos en todo el historial git |

## Piso (bloquea)

| Regla | Comando | Por qué |
|---|---|---|
| Typecheck sin errores en las dos apps | `npm run typecheck` | Es la única red que tiene el proyecto: sin tests, un error de tipos llega a producción con el push. |
| Build sin errores en las dos apps | `npm run build` | Cloudflare Workers Builds despliega cada push a `main`; si el build rompe ahí, el deploy falla a la vista del usuario. |
| Ningún secreto en archivos del repo (incluidos los sin trackear) | `npm run check:secrets` → `gitleaks dir . --redact --no-banner` | Ya apareció un token personal de Supabase suelto (`codigo.txt`). Un `sbp_` o la `service_role` dan control total de la base. |
| Ningún secreto en el historial git | `gitleaks git --redact --no-banner` (en `check:full`) | El repo de GitHub es **público**: lo que entra a un commit pusheado queda expuesto para siempre. |

Reglas propias de gitleaks (`.gitleaks.toml`, además de las por defecto):
tokens personales de Supabase (`sbp_…`) y `SUPABASE_SERVICE_ROLE_KEY` con valor
literal. Se ignoran salidas de build, `node_modules`, `graphify-out/` y los
`.env*` (están en `.gitignore`).

## Arquitectura (bloquea)

`npm run check:arch` → `node scripts/check-arch.mjs` (dependency-cruiser con
`.dependency-cruiser.cjs`, una corrida por app con su tsconfig).

| Regla | Por qué |
|---|---|
| `apps/campus` no importa de `apps/marketing`, ni al revés | Son dos Workers que se despliegan por separado; lo compartido va en `packages/services`. |
| `packages/*` no importa de `apps/*` | `packages` es la base de las dos apps; si depende de una, la otra se rompe. |
| Sin imports circulares | Rompen el orden de inicialización de módulos en Workers y son difíciles de rastrear. |

Hoy (commit `e429ec4`): 0 violaciones.

## Tamaño del bundle (avisa, no bloquea)

`npm run check:size` → `size-limit` con `.size-limit.json`. Mide la suma comprimida (brotli) de
todo el JS de cliente (`.next/static/chunks/**/*.js`) después del build.

| App | Medido 2026-09-27 | Techo | Por qué ese techo |
|---|---|---|---|
| campus | 300,6 kB | 331 kB | Hoy + 10%: margen para cambios normales, pero una librería pesada nueva (animaciones, charts, UI kits) lo supera y se ve. |
| marketing | 493,7 kB | 544 kB | Ídem. |

Si se supera: no bloquea, pero se reporta al usuario con qué lo causó. Subir
el techo requiere su OK y una línea en "Excepciones".

## Medido, sin gate (referencia para no empeorar)

Valores del 2026-09-27 en `apps/*/src` y `packages/*/src`. No bloquean; un
cambio que los **aumente** se menciona al usuario.

| Métrica | Hoy |
|---|---|
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | 4 |
| `eslint-disable` | 8 |
| `any` (`: any`, `as any`, `<any>`) | 331 |
| `TODO` / `FIXME` | 2 |

## Guardia: qué cuenta como bajar el piso

Ninguno de estos cambios se hace para que algo pase; si hace falta, se pregunta:

- Agregar rutas o reglas al `[allowlist]` de `.gitleaks.toml`, o líneas a `.gitleaksignore`.
- Sacar o relajar una regla de `.dependency-cruiser.cjs` (o pasarla a `warn`).
- Subir un `limit` de `.size-limit.json`.
- Agregar `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` o `as any` para callar el typecheck.
- Sacar un script `check:*` de `package.json` o quitarle un paso.

## Excepciones

| Qué | Dónde | Por qué | Dueño | Revisar |
|---|---|---|---|---|
| 8 JWT en commits viejos + 2 en `wrangler.jsonc` | `.gitleaksignore` | Son la clave `anon` de Supabase (verificado decodificando `role=anon`): pública por diseño, viaja al navegador en `NEXT_PUBLIC_SUPABASE_ANON_KEY`. | Gonzalo | 2027-03-27, o si se rota la clave |

## Fallas abiertas

| Qué | Estado | Qué hacer |
|---|---|---|
| `codigo.txt` (raíz, sin trackear) tiene un token personal de Supabase | `check:secrets` falla hasta resolverlo | Revocar el token en supabase.com → Account → Access Tokens y borrar el archivo. **No** agregarlo a las excepciones. |
| El mismo token está en el commit `13bd495`: la parte "untracked" del `stash@{0}` viejo (no está en ninguna rama ni en GitHub) | `gitleaks git` (en `check:full`) falla | Revocar el token y descartar ese stash (`git stash drop stash@{0}`; lo útil ya está en `main`). **No** agregarlo a `.gitleaksignore`. |
