// Datos de contacto de HOME, en un solo lugar.
// Mismo número que muestra la sección Contacto de la landing.

export const CAMPUS_WHATSAPP = '5491130586930';

/** Link de WhatsApp con un mensaje ya escrito. */
export function whatsappHref(message: string): string {
  return `https://wa.me/${CAMPUS_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
