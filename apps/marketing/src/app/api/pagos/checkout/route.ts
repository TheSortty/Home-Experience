/**
 * Arranca un pago: arma la preferencia de Checkout Pro y devuelve el link de
 * Mercado Pago.
 *
 * El navegador manda un código de ítem ('combo_1', 'initial', …) y nada más.
 * El precio se lee de site_settings acá adentro: si viajara en el request,
 * cualquiera podría pagar el combo completo a un peso editando el fetch.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@home/services/supabase/server';
import { serviceClient } from '@home/services/calendarSync';
import { createPreference } from '@home/services/mercadoPago';
import { PAYMENT_ITEMS, isPaymentItemCode, parsePrice } from '@home/services/pricing';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const itemCode = (body as { item?: unknown })?.item;
  if (!isPaymentItemCode(itemCode)) {
    return NextResponse.json({ error: 'Ítem desconocido' }, { status: 400 });
  }
  const item = PAYMENT_ITEMS[itemCode];

  if (!process.env.MP_ACCESS_TOKEN) {
    console.error('[pagos] falta MP_ACCESS_TOKEN');
    return NextResponse.json({ error: 'El pago online no está configurado' }, { status: 503 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
  const db = serviceClient();

  // ── Precio y promo, desde la base ────────────────────────────────────────
  const { data: settings, error: settingsError } = await db
    .from('site_settings')
    .select('key,value')
    .in('key', [item.settingsKey, 'promo_installments', 'promo_installments_until']);

  if (settingsError) {
    console.error('[pagos] no se pudieron leer los precios:', settingsError);
    return NextResponse.json({ error: 'No se pudo leer el precio' }, { status: 500 });
  }

  const setting = (key: string) => settings?.find(s => s.key === key)?.value ?? null;

  const unitPrice = parsePrice(setting(item.settingsKey));
  if (unitPrice === null) {
    // Mejor cortar que cobrar un número que no entendimos.
    console.error(`[pagos] precio ilegible en site_settings.${item.settingsKey}`);
    return NextResponse.json({ error: 'El precio no está configurado' }, { status: 503 });
  }

  const maxInstallments = resolveInstallments(
    setting('promo_installments'),
    setting('promo_installments_until'),
  );

  // ── Quién paga (si está logueado) ────────────────────────────────────────
  let profileId: string | null = null;
  let payerEmail: string | null = null;
  let payerName: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      payerEmail = user.email ?? null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id,first_name,last_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile) {
        profileId = profile.id;
        payerName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || null;
      }
    }
  } catch (err) {
    // Comprar sin cuenta es un caso válido: la landing es pública.
    console.warn('[pagos] no se pudo resolver el usuario:', err);
  }

  // ── Fila pendiente ───────────────────────────────────────────────────────
  // Se crea ANTES de ir a Mercado Pago para tener un id propio que viaje como
  // external_reference. Así el webhook sabe a qué intento corresponde el pago
  // aunque el comprador nunca vuelva al sitio.
  const { data: payment, error: insertError } = await db
    .from('payments')
    .insert({
      amount: unitPrice,
      currency: 'ARS',
      method: 'mercadopago',
      status: 'pending',
      item_code: item.code,
      payer_email: payerEmail,
      payer_name: payerName,
    })
    .select('id')
    .single();

  if (insertError || !payment) {
    console.error('[pagos] no se pudo registrar el intento:', insertError);
    return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 500 });
  }

  // ── Preferencia ──────────────────────────────────────────────────────────
  try {
    const preference = await createPreference({
      itemCode: item.code,
      title: item.title,
      description: item.description,
      unitPrice,
      externalReference: payment.id,
      baseUrl,
      notificationUrl: `${baseUrl}/api/pagos/webhook`,
      maxInstallments,
      payer: { email: payerEmail, name: payerName },
    });

    await db
      .from('payments')
      .update({ preference_id: preference.id, updated_at: new Date().toISOString() })
      .eq('id', payment.id);

    return NextResponse.json({
      paymentId: payment.id,
      preferenceId: preference.id,
      initPoint: preference.initPoint,
      amount: unitPrice,
      installments: maxInstallments,
    });
  } catch (err) {
    console.error('[pagos] createPreference falló:', err);
    // El intento queda como fallado y no como pendiente eterno.
    await db
      .from('payments')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', payment.id);
    return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 502 });
  }
}

/**
 * Cuotas a ofrecer. Vencida la promo vuelve a 1 sola, sin que nadie tenga que
 * acordarse de desactivarla el 1 de noviembre.
 */
function resolveInstallments(rawCount: string | null, rawUntil: string | null): number {
  const count = Number(rawCount);
  if (!Number.isFinite(count) || count < 1) return 1;

  if (rawUntil) {
    const until = new Date(`${rawUntil}T23:59:59-03:00`);
    if (!Number.isNaN(until.getTime()) && Date.now() > until.getTime()) return 1;
  }

  return Math.min(Math.floor(count), 24);
}
