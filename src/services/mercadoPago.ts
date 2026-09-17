/**
 * Cliente de Mercado Pago — Checkout Pro.
 *
 * SOLO SERVIDOR: usa el access token privado. Nada de acá puede importarse
 * desde un componente cliente.
 *
 * Se habla contra la API REST en vez de usar el SDK de Node porque el sitio
 * corre en Cloudflare Workers: ahí no hay `node:crypto` ni `node:https`, que es
 * de lo que cuelga el SDK. `fetch` y WebCrypto sí están.
 */

const MP_API = 'https://api.mercadopago.com';

export class MercadoPagoError extends Error {
  constructor(public status: number, public body: string) {
    super(`Mercado Pago respondió ${status}: ${body}`);
    this.name = 'MercadoPagoError';
  }
}

function accessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('Falta MP_ACCESS_TOKEN');
  return token;
}

async function mpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new MercadoPagoError(response.status, await response.text().catch(() => ''));
  }
  return response.json() as Promise<T>;
}

// ─── Preferencias ────────────────────────────────────────────────────────────

export interface CreatePreferenceInput {
  itemCode: string;
  title: string;
  description: string;
  /** En pesos. Sale de site_settings, nunca del navegador. */
  unitPrice: number;
  /** Nuestro id de la fila en payments — vuelve intacto en el webhook. */
  externalReference: string;
  baseUrl: string;
  notificationUrl: string;
  maxInstallments: number;
  payer?: { email?: string | null; name?: string | null };
}

export interface PreferenceResult {
  id: string;
  initPoint: string;
  sandboxInitPoint: string | null;
}

export async function createPreference(input: CreatePreferenceInput): Promise<PreferenceResult> {
  const data = await mpFetch<{
    id: string;
    init_point: string;
    sandbox_init_point?: string;
  }>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [{
        id: input.itemCode,
        title: input.title,
        description: input.description,
        category_id: 'learnings',
        quantity: 1,
        currency_id: 'ARS',
        unit_price: input.unitPrice,
      }],
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      back_urls: {
        success: `${input.baseUrl}/pago/exito`,
        pending: `${input.baseUrl}/pago/pendiente`,
        failure: `${input.baseUrl}/pago/error`,
      },
      auto_return: 'approved',
      payment_methods: {
        // Tope de cuotas de la promo. Que sean SIN INTERÉS depende de la promo
        // configurada en el panel de Mercado Pago, no de este campo: acá sólo
        // se limita hasta cuántas se pueden elegir.
        installments: input.maxInstallments,
        excluded_payment_types: [],
        excluded_payment_methods: [],
      },
      ...(input.payer?.email
        ? { payer: { email: input.payer.email, name: input.payer.name ?? undefined } }
        : {}),
      statement_descriptor: 'HOME EXPERIENCE',
    }),
  });

  return {
    id: data.id,
    initPoint: data.init_point,
    sandboxInitPoint: data.sandbox_init_point ?? null,
  };
}

// ─── Pagos ───────────────────────────────────────────────────────────────────

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string | null;
  external_reference: string | null;
  transaction_amount: number | null;
  installments: number | null;
  payment_method_id: string | null;
  payment_type_id: string | null;
  date_approved: string | null;
  payer?: {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
  [key: string]: unknown;
}

/**
 * El webhook trae sólo un id. El estado real se pide siempre a la API: el
 * cuerpo de la notificación no está firmado campo por campo y puede llegar
 * atrasado respecto del pago.
 */
export function getPayment(paymentId: string): Promise<MercadoPagoPayment> {
  return mpFetch<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);
}

/** Mapea los estados de Mercado Pago a los que usa payments.status. */
export function mapPaymentStatus(mpStatus: string): 'paid' | 'pending' | 'failed' | 'refunded' {
  switch (mpStatus) {
    case 'approved':
      return 'paid';
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'pending';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      // rejected, cancelled y cualquier estado nuevo que aparezca.
      return 'failed';
  }
}

// ─── Firma del webhook ───────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Valida el header x-signature.
 *
 * El manifiesto que firma Mercado Pago es
 *   `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * con data.id en minúsculas, y omitiendo las partes que vengan vacías.
 *
 * Sin esto cualquiera que sepa la URL puede marcar pagos como aprobados.
 */
export async function isValidWebhookSignature(params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): Promise<boolean> {
  const { signatureHeader, requestId, dataId, secret } = params;
  if (!signatureHeader || !secret) return false;

  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of signatureHeader.split(',')) {
    const [rawKey, ...rest] = part.split('=');
    if (!rest.length) continue;
    const key = rawKey.trim();
    const value = rest.join('=').trim();
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }
  if (!ts || !v1) return false;

  const segments: string[] = [];
  if (dataId) segments.push(`id:${dataId.toLowerCase()}`);
  if (requestId) segments.push(`request-id:${requestId}`);
  segments.push(`ts:${ts}`);
  const manifest = `${segments.join(';')};`;

  return timingSafeEqual(await hmacSha256Hex(secret, manifest), v1);
}
