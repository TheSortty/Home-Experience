/**
 * Precios y promo vigente, para la pantalla de pago de la landing.
 *
 * Público y de solo lectura — nadie compra desde acá, este endpoint no
 * mueve plata. Existe para que el navegador no lea site_settings directo:
 * esa tabla sólo tiene permiso de authenticated, y quien está por pagar
 * puede no haber iniciado sesión (el formulario de inscripción es público).
 */

import { NextResponse } from 'next/server';
import { serviceClient } from '@home/services/calendarSync';
import { PAYMENT_ITEMS, parsePrice, resolveInstallments } from '@home/services/pricing';

export async function GET() {
  const db = serviceClient();
  const { data: settings, error } = await db
    .from('site_settings')
    .select('key,value')
    .in('key', [
      ...Object.values(PAYMENT_ITEMS).map(item => item.settingsKey),
      'promo_installments',
      'promo_installments_until',
      'promo_installments_note',
    ]);

  if (error) {
    console.error('[pagos/precios] no se pudieron leer los precios:', error);
    return NextResponse.json({ error: 'No se pudieron leer los precios' }, { status: 500 });
  }

  const setting = (key: string) => settings?.find(s => s.key === key)?.value ?? null;

  const items = Object.values(PAYMENT_ITEMS).map(item => ({
    code: item.code,
    title: item.title,
    description: item.description,
    price: parsePrice(setting(item.settingsKey)),
  }));

  const installments = resolveInstallments(setting('promo_installments'), setting('promo_installments_until'));

  return NextResponse.json({
    items,
    installments,
    installmentsNote: installments > 1 ? setting('promo_installments_note') : null,
  });
}
