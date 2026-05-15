/**
 * Raw REST client para PostgREST que NO depende del cliente JS de Supabase.
 *
 * Por qué existe:
 *   El cliente JS de @supabase/supabase-js + @supabase/ssr cuelga en runtime
 *   después de unos segundos en el panel admin (probablemente por el realtime
 *   websocket + concurrencia de los tabs persistent-mounted). Internamente
 *   cada query llama a auth.getSession() que queda esperando un lock que
 *   nunca se libera.
 *
 * Solución:
 *   Leer el access_token directamente de la cookie de @supabase/ssr y hacer
 *   fetch directo a PostgREST. Bypasea TODO el cliente JS para operaciones
 *   CRUD admin.
 *
 * Limitaciones:
 *   - No usar para auth (login/logout/refresh). Solo para datos.
 *   - El token de cookie puede estar vencido si la sesión es muy vieja, pero
 *     el middleware lo rota en cada navegación así que en la práctica nunca
 *     debería pasar.
 *   - No emite eventos de realtime — para eso seguís usando supabase.channel.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1] ?? ''
const COOKIE_BASE = `sb-${PROJECT_REF}-auth-token`

const REQUEST_TIMEOUT_MS = 20_000

export class RestError extends Error {
  status: number
  body: string
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body}`)
    this.status = status
    this.body = body
  }
}

/**
 * Decodes the JWT from cookie and returns the user_id (sub claim) without
 * calling supabase.auth.getUser() (which can hang in the admin panel).
 */
export function getCurrentUserId(): string | null {
  const token = readAccessTokenFromCookie()
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded.sub ?? null
  } catch {
    return null
  }
}

function readAccessTokenFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const allCookies = document.cookie.split(';').map(c => c.trim())
  const chunks: string[] = []
  const base = allCookies.find(c => c.startsWith(`${COOKIE_BASE}=`))
  if (base) chunks.push(base.split('=').slice(1).join('='))
  for (let i = 0; ; i++) {
    const chunk = allCookies.find(c => c.startsWith(`${COOKIE_BASE}.${i}=`))
    if (!chunk) break
    chunks.push(chunk.split('=').slice(1).join('='))
  }
  if (chunks.length === 0) return ''

  let raw = decodeURIComponent(chunks.join(''))
  if (raw.startsWith('base64-')) {
    const b64 = raw.slice(7).replace(/-/g, '+').replace(/_/g, '/')
    try {
      raw = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    } catch {
      return ''
    }
  }
  try {
    const parsed = JSON.parse(raw)
    return parsed.access_token ?? ''
  } catch {
    return ''
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = readAccessTokenFromCookie() || SUPABASE_ANON_KEY
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function rawFetch(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), init.timeoutMs ?? REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new RestError(response.status, body)
  }
  // 204 No Content (return=minimal)
  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

// ─── Query builders ─────────────────────────────────────────────────────────

export type SelectOptions = {
  /** Columns to select, default '*' */
  columns?: string
  /**
   * Filter pairs like { status: 'eq.active' }.
   * Pass an array value to add the same key multiple times
   * (e.g. { session_date: ['gte.2024-01-01', 'lte.2024-01-07'] }).
   */
  filters?: Record<string, string | string[]>
  /** Order clause like 'created_at.desc' */
  order?: string
  /** Limit number of rows */
  limit?: number
  /** Count mode (head=true returns no rows, only count header) */
  count?: 'exact' | 'planned' | 'estimated'
  /** When true, only fetches the count via HEAD */
  head?: boolean
}

function buildSelectUrl(table: string, opts: SelectOptions = {}): string {
  const params = new URLSearchParams()
  params.set('select', opts.columns ?? '*')
  if (opts.filters) {
    for (const [k, v] of Object.entries(opts.filters)) {
      if (Array.isArray(v)) {
        v.forEach(val => params.append(k, val))
      } else {
        params.append(k, v)
      }
    }
  }
  if (opts.order) params.set('order', opts.order)
  if (opts.limit != null) params.set('limit', String(opts.limit))
  return `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`
}

export async function restSelect<T = any>(table: string, opts: SelectOptions = {}): Promise<{ data: T[]; count: number | null }> {
  const url = buildSelectUrl(table, opts)
  const headers = buildHeaders(
    opts.count
      ? { Prefer: `count=${opts.count}`, Range: opts.head ? '0-0' : '' }
      : undefined
  )
  const response = await rawFetch(url, {
    method: opts.head ? 'HEAD' : 'GET',
    headers,
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new RestError(response.status, body)
  }
  let count: number | null = null
  const contentRange = response.headers.get('content-range')
  if (contentRange) {
    const total = contentRange.split('/')[1]
    if (total && total !== '*') count = parseInt(total, 10)
  }
  const data = opts.head ? [] : await parseResponse<T[]>(response)
  return { data: Array.isArray(data) ? data : [], count }
}

export async function restInsert<T = any>(table: string, payload: any, opts: { returning?: 'minimal' | 'representation' } = {}): Promise<T | null> {
  const url = `${SUPABASE_URL}/rest/v1/${table}`
  const returning = opts.returning ?? 'representation'
  const response = await rawFetch(url, {
    method: 'POST',
    headers: buildHeaders({ Prefer: `return=${returning}` }),
    body: JSON.stringify(payload),
  })
  const data = await parseResponse<T[]>(response)
  if (Array.isArray(data) && data.length > 0) return data[0]
  return null
}

export async function restUpdate<T = any>(
  table: string,
  payload: any,
  filters: Record<string, string>,
  opts: { returning?: 'minimal' | 'representation' } = {}
): Promise<T | null> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) params.append(k, v)
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`
  const returning = opts.returning ?? 'minimal'
  const response = await rawFetch(url, {
    method: 'PATCH',
    headers: buildHeaders({ Prefer: `return=${returning}` }),
    body: JSON.stringify(payload),
  })
  const data = await parseResponse<T[]>(response)
  if (Array.isArray(data) && data.length > 0) return data[0]
  return null
}

export async function restUpsert<T = any>(
  table: string,
  payload: any,
  opts: { onConflict?: string; returning?: 'minimal' | 'representation' } = {}
): Promise<T | null> {
  const params = new URLSearchParams()
  if (opts.onConflict) params.set('on_conflict', opts.onConflict)
  const url = `${SUPABASE_URL}/rest/v1/${table}${params.toString() ? `?${params.toString()}` : ''}`
  const returning = opts.returning ?? 'representation'
  const response = await rawFetch(url, {
    method: 'POST',
    headers: buildHeaders({
      Prefer: `return=${returning},resolution=merge-duplicates`,
    }),
    body: JSON.stringify(payload),
  })
  const data = await parseResponse<T[]>(response)
  if (Array.isArray(data) && data.length > 0) return data[0]
  return null
}

export async function restRpc<T = any>(fnName: string, params?: Record<string, any>): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`
  const response = await rawFetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(params ?? {}),
  })
  return await parseResponse<T>(response)
}

export async function restDelete(table: string, filters: Record<string, string>): Promise<void> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) params.append(k, v)
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`
  const response = await rawFetch(url, {
    method: 'DELETE',
    headers: buildHeaders({ Prefer: 'return=minimal' }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new RestError(response.status, body)
  }
}
