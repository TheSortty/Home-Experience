/**
 * Adónde vuelve el comprador desde Mercado Pago: /pago/exito, /pago/pendiente
 * y /pago/error.
 *
 * Es sólo una pantalla de cortesía. Lo que decide si el pago está cobrado es el
 * webhook, no esta vuelta: el comprador puede cerrar la pestaña antes de
 * volver, o volver a /pago/exito con un pago que MP todavía no acreditó.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';

const ESTADOS = {
  exito: {
    emoji: '✓',
    tone: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    title: 'Recibimos tu pago',
    body: 'Te va a llegar el comprobante de Mercado Pago por mail. Nos ponemos en contacto para coordinar tu lugar en la próxima camada.',
  },
  pendiente: {
    emoji: '⏳',
    tone: 'text-amber-600 bg-amber-50 border-amber-200',
    title: 'Tu pago está en proceso',
    body: 'Algunos medios de pago (efectivo o transferencia desde el homebanking) tardan un rato en acreditarse. Apenas Mercado Pago lo confirme te avisamos.',
  },
  error: {
    emoji: '✕',
    tone: 'text-red-600 bg-red-50 border-red-200',
    title: 'No se pudo completar el pago',
    body: 'No se hizo ningún cargo. Podés intentar de nuevo con otro medio de pago, o escribirnos y lo resolvemos juntos.',
  },
} as const;

type Estado = keyof typeof ESTADOS;

export function generateStaticParams() {
  return Object.keys(ESTADOS).map(estado => ({ estado }));
}

export default async function PagoEstadoPage({
  params,
}: {
  params: Promise<{ estado: string }>;
}) {
  const { estado } = await params;
  if (!(estado in ESTADOS)) notFound();
  const info = ESTADOS[estado as Estado];

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-32">
      <div className="max-w-lg w-full bg-white rounded-[2rem] border border-sand-medium/40 shadow-xl p-10 text-center">
        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl mx-auto mb-6 ${info.tone}`}>
          {info.emoji}
        </div>

        <h1 className="text-3xl font-serif font-bold text-black-soft mb-4">{info.title}</h1>
        <p className="text-grey-smoke leading-relaxed mb-8">{info.body}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-black-soft text-white rounded-xl font-bold hover:bg-grey-smoke transition-colors"
          >
            Volver al inicio
          </Link>
          {estado === 'error' && (
            <Link
              href="/#pricing"
              className="px-6 py-3 border border-sand-medium text-black-soft rounded-xl font-medium hover:bg-sand-light/40 transition-colors"
            >
              Intentar de nuevo
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
