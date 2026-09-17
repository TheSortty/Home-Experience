/**
 * Catálogo de lo que se puede pagar y de dónde sale cada precio.
 *
 * El precio vive en site_settings para que se edite desde Configuración Web
 * sin tocar código, pero el que manda es SIEMPRE el del servidor: el navegador
 * elige un código de ítem, nunca un monto.
 */

export type PaymentItemCode =
  | 'initial'
  | 'advanced'
  | 'leadership'
  | 'combo_1'
  | 'combo_2';

export interface PaymentItem {
  code: PaymentItemCode;
  /** Clave en site_settings de donde sale el precio. */
  settingsKey: string;
  title: string;
  description: string;
}

export const PAYMENT_ITEMS: Record<PaymentItemCode, PaymentItem> = {
  initial: {
    code: 'initial',
    settingsKey: 'price_initial',
    title: 'Nivel INICIAL',
    description: 'Programa CreSER — Nivel INICIAL (4 días)',
  },
  advanced: {
    code: 'advanced',
    settingsKey: 'price_advanced',
    title: 'Nivel AVANZADO',
    description: 'Programa CreSER — Nivel AVANZADO (5 días)',
  },
  leadership: {
    code: 'leadership',
    settingsKey: 'price_leadership',
    title: 'Programa de Liderazgo',
    description: 'Programa CreSER — Programa de Liderazgo (3 meses)',
  },
  combo_1: {
    code: 'combo_1',
    settingsKey: 'price_combo_1_cash',
    title: 'Combo CreSER',
    description: 'Programa CreSER — INICIAL + AVANZADO',
  },
  combo_2: {
    code: 'combo_2',
    settingsKey: 'price_combo_2_cash',
    title: 'Combo CreSER completo',
    description: 'Programa CreSER — INICIAL + AVANZADO + Programa de Liderazgo',
  },
};

export function isPaymentItemCode(value: unknown): value is PaymentItemCode {
  return typeof value === 'string' && value in PAYMENT_ITEMS;
}

/**
 * Los precios se cargan a mano en Configuración Web, así que llegan escritos
 * como se les cante: "480000", "$480.000", "480.000,00". Todo eso tiene que
 * terminar en el mismo número o le cobramos cualquier cosa a alguien.
 */
export function parsePrice(raw: string | null | undefined): number | null {
  if (!raw) return null;

  let cleaned = String(raw).replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalSep = lastComma > lastDot ? ',' : lastDot > lastComma ? '.' : '';

  if (decimalSep) {
    const decimals = cleaned.length - cleaned.lastIndexOf(decimalSep) - 1;
    // Con 3 dígitos detrás es un separador de miles ("480.000"), no decimales.
    if (decimals === 3) {
      cleaned = cleaned.replace(/[.,]/g, '');
    } else {
      const intPart = cleaned.slice(0, cleaned.lastIndexOf(decimalSep)).replace(/[.,]/g, '');
      const decPart = cleaned.slice(cleaned.lastIndexOf(decimalSep) + 1);
      cleaned = `${intPart}.${decPart}`;
    }
  } else {
    cleaned = cleaned.replace(/[.,]/g, '');
  }

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** "480000" → "$480.000". Para mostrar, no para cobrar. */
export function formatPrice(value: number): string {
  return `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}
