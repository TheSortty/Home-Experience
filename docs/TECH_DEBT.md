# Tech Debt — Pendientes de Implementación

---

## [C] Migrar páginas del campus a `supabaseRest.ts` (fix definitivo del Error 1101)

**Prioridad:** Alta  
**Estado:** Pendiente  
**Referencia:** Cloudflare Error 1101 — "Cannot perform I/O on behalf of a different request (I/O type: RefcountedCanceler)"  
**Registrado:** 2026-05-26

### Contexto

Los Server Components de Next.js que corren en Cloudflare Workers usan el cliente
`@supabase/supabase-js`. Internamente, este cliente crea un `AbortController` con
`setTimeout` para cada request de red (p. ej. `getUser()`, `.from().select()`).

En Cloudflare Workers el runtime **no permite** que código asíncrono creado durante
el manejo de un request se ejecute fuera del ciclo de vida de ese request. Cuando el
`setTimeout` del AbortController dispara *después* de que la respuesta ya fue
enviada, Cloudflare lanza:

```
Error: Cannot perform I/O on behalf of a different request (I/O type: RefcountedCanceler)
```

### Fixes aplicados (A + B) — 2026-05-26

- **A**: Se añadió `try/catch` alrededor de cada bloque de queries en
  `src/app/(campus)/dashboard/page.tsx` y `src/app/(campus)/layout.tsx`.
  Cualquier fallo produce fallbacks seguros (arrays vacíos, strings "Alumno", etc.)
  en lugar de crashear el Worker.

- **B**: En `dashboard/page.tsx` se reemplazó `supabase.auth.getUser()` (que hace
  un round-trip de red al servidor de Auth de Supabase) por
  `supabase.auth.getSession()` (que lee directamente de la cookie del request, sin
  I/O). El layout + middleware ya validaron el JWT para el mismo request, así que
  es seguro leer la sesión en caché.

### Fix definitivo pendiente (C)

**Replicar el patrón `supabaseRest.ts` en los Server Components del campus.**

El panel de administración ya usa `supabaseRest.ts` (fetch REST puro, sin el cliente
JS de Supabase) para todas sus queries de datos. Esto elimina completamente los
`AbortController` + `setTimeout` del cliente JS.

#### Archivos a migrar

| Archivo | Queries problemáticas |
|---|---|
| `src/app/(campus)/dashboard/page.tsx` | `profiles`, `courses`, `getStudentProgress` (interno), `lessons`, `course_sessions`, `cycle_sessions` |
| `src/app/(campus)/layout.tsx` | `profiles` |
| `src/services/roleService.ts` | `resolveRole()` server-side usa RPC con el cliente JS |
| `src/services/progressService.ts` | `getStudentProgress()` usa el cliente JS internamente |

#### Guía de migración

```ts
// Antes (Supabase JS — genera AbortController + setTimeout)
const { data } = await supabase.from('profiles').select('first_name').eq('user_id', uid).single();

// Después (REST puro — sin timers)
import { restSelect } from '@/src/services/supabaseRest';
const { data } = await restSelect<Profile>('profiles', {
  columns: 'first_name',
  filters: { user_id: `eq.${uid}` },
  single: true,
});
```

Para RPCs:
```ts
// Antes
const { data } = await supabase.rpc('resolve_role', { uid });

// Después
import { restRpc } from '@/src/services/supabaseRest';
const { data } = await restRpc<string>('resolve_role', { uid });
```

#### Notas

- `supabaseRest.ts` usa el **service role key** del lado del servidor (env var
  `SUPABASE_SERVICE_ROLE_KEY`). Verificar que esté seteada en Cloudflare Pages.
- Las queries con joins (p. ej. `courses(title)`) son compatibles con el cliente
  REST de Supabase — usar la notación `columns: 'id, course:courses(title)'`.
- `getStudentProgress` y `resolveRole` necesitan refactors internos propios;
  hacerlos en un paso separado para no mezclar contextos.
- Una vez migrado, se pueden eliminar los `try/catch` de A y la workaround de B
  (aunque no hace daño dejarlos).

---

*Archivado como referencia para la siguiente iteración de refactor del campus.*
