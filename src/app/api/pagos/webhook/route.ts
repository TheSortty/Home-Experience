/**
 * Notificaciones de Mercado Pago.
 *
 * Esta ruta es pública y es la que decide que un pago está cobrado, así que
 * todo lo que llega se trata como no confiable:
 *
 *   - se valida la firma x-signature antes de mirar nada;
 *   - el estado NO se toma del cuerpo, se vuelve a pedir a la API de MP;
 *   - el monto tampoco: se compara contra lo que quedó guardado al iniciar.
 *
 * Mercado Pago reintenta hasta recibir un 2xx, y manda la misma notificación
 * más de una vez, así que el manejo es idempotente.
 */

import { NextResponse } from 'next/server';
import { serviceClient } from '@/src/services/calendarSync';
import {
  getPayment,
  isValidWebhookSignature,
  mapPaymentStatus,
  type MercadoPagoPayment,
} from '@/src/services/mercadoPago';

export async function POST(request: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[pagos/webhook] falta MP_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'no configurado' }, { status: 503 });
  }

  const url = new URL(request.url);
  const queryDataId = url.searchParams.get('data.id') ?? url.searchParams.get('id');

  const valid = await isValidWebhookSignature({
    signatureHeader: request.headers.get('x-signature'),
    requestId: request.headers.get('x-request-id'),
    dataId: queryDataId,
    secret,
  });
  if (!valid) {
    console.warn('[pagos/webhook] firma inválida');
    return NextResponse.json({ error: 'firma inválida' }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    // Algunas notificaciones llegan sin cuerpo; alcanza con el id de la query.
  }

  const topic = body?.type ?? body?.topic ?? url.searchParams.get('type');
  if (topic && topic !== 'payment') {
    // merchant_order y compañía: se aceptan para que MP no reintente.
    return NextResponse.json({ ignored: topic });
  }

  const paymentId = String(body?.data?.id ?? queryDataId ?? '');
  if (!paymentId) return NextResponse.json({ error: 'sin id de pago' }, { status: 400 });

  let mpPayment: MercadoPagoPayment;
  try {
    mpPayment = await getPayment(paymentId);
  } catch (err) {
    console.error('[pagos/webhook] no se pudo leer el pago en MP:', err);
    // 502 y no 200: que MP reintente, el pago existe pero no lo pudimos leer.
    return NextResponse.json({ error: 'no se pudo consultar el pago' }, { status: 502 });
  }

  const db = serviceClient();
  const status = mapPaymentStatus(mpPayment.status);
  const payerName = [mpPayment.payer?.first_name, mpPayment.payer?.last_name]
    .filter(Boolean).join(' ').trim() || null;

  const fields = {
    status,
    external_id: String(mpPayment.id),
    method: 'mercadopago',
    installments: mpPayment.installments ?? null,
    payer_email: mpPayment.payer?.email ?? null,
    payer_name: payerName,
    raw: mpPayment as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
    // Sólo se escribe al acreditarse. Si después el pago se reembolsa, la fecha
    // de cobro original sigue siendo un dato: no se pisa con null.
    ...(status === 'paid'
      ? { paid_at: mpPayment.date_approved ?? new Date().toISOString() }
      : {}),
  };

  // ── A qué fila corresponde ───────────────────────────────────────────────
  // 1. La que ya tenga este id de MP (reintento de una notificación vieja).
  // 2. Si no, el intento que creó el checkout, todavía sin id de MP.
  // 3. Si no, una fila nueva: pasa si el cobro se generó fuera del sitio.
  const { data: byExternal } = await db
    .from('payments')
    .select('id,status,amount,item_code')
    .eq('external_id', String(mpPayment.id))
    .maybeSingle();

  let row = byExternal ?? null;

  if (!row && mpPayment.external_reference) {
    const { data: byReference } = await db
      .from('payments')
      .select('id,status,amount,item_code')
      .eq('id', mpPayment.external_reference)
      .is('external_id', null)
      .maybeSingle();
    row = byReference ?? null;
  }

  const wasAlreadyPaid = row?.status === 'paid';

  if (row) {
    // El monto que cobró MP contra el que pusimos al crear la preferencia. No
    // frena nada —la plata ya entró— pero deja el desvío escrito en vez de
    // pisar el importe en silencio.
    if (row.amount != null && mpPayment.transaction_amount != null
        && Number(row.amount) !== Number(mpPayment.transaction_amount)) {
      console.error(
        `[pagos/webhook] monto distinto en el pago ${mpPayment.id}: ` +
        `esperado ${row.amount}, cobrado ${mpPayment.transaction_amount}`,
      );
    }

    const { error } = await db.from('payments').update(fields).eq('id', row.id);
    if (error) {
      console.error('[pagos/webhook] no se pudo actualizar el pago:', error);
      return NextResponse.json({ error: 'no se pudo guardar' }, { status: 500 });
    }
  } else {
    const { data: inserted, error } = await db
      .from('payments')
      .insert({
        ...fields,
        amount: mpPayment.transaction_amount,
        currency: 'ARS',
      })
      .select('id,item_code')
      .single();
    if (error) {
      console.error('[pagos/webhook] no se pudo registrar el pago:', error);
      return NextResponse.json({ error: 'no se pudo guardar' }, { status: 500 });
    }
    row = { id: inserted.id, status, amount: mpPayment.transaction_amount, item_code: inserted.item_code };
  }

  // ── Aviso a la bandeja de actividad ──────────────────────────────────────
  // Sólo en la transición a cobrado, para que un reintento de MP no llene la
  // bandeja del mismo pago.
  if (status === 'paid' && !wasAlreadyPaid) {
    const { error } = await db.from('staff_activity_events').insert({
      event_type: 'payment.approved',
      actor_profile_id: null,
      actor_role: 'system',
      target_kind: 'payment',
      target_id: row.id,
      details: {
        amount: mpPayment.transaction_amount,
        currency: 'ARS',
        itemCode: row.item_code ?? null,
        payerName,
        payerEmail: mpPayment.payer?.email ?? null,
        installments: mpPayment.installments ?? null,
        paymentMethod: mpPayment.payment_method_id ?? null,
        mercadoPagoId: String(mpPayment.id),
      },
    });
    if (error) console.warn('[pagos/webhook] no se pudo avisar a la bandeja:', error);
  }

  return NextResponse.json({ ok: true, status });
}
