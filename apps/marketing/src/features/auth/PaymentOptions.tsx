'use client';

// Pantalla de pago real (Checkout Pro). Reemplaza a la versión anterior, que
// tenía precios fijos y links estáticos de mpago.la de una integración
// vieja — nunca llamaba al backend de /api/pagos.
//
// Mercado Pago es una opción más, no la única: efectivo y transferencia
// siguen disponibles para los 5 ítems (decisión del 2026-09-27, ver
// SPEC-mercadopago.md).

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ChevronIcon from '../../ui/icons/ChevronIcon';
import { formatPrice, type PaymentItemCode } from '@home/services/pricing';

const WHATSAPP_NUMBER = '5491151589383';
const waLink = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

interface PriceItem {
  code: PaymentItemCode;
  title: string;
  description: string;
  price: number | null;
}
interface Precios {
  items: PriceItem[];
  installments: number;
  installmentsNote: string | null;
}

const COMBO_CODES = new Set<PaymentItemCode>(['combo_1', 'combo_2']);

const PaymentOptions: React.FC = () => {
  const [precios, setPrecios] = useState<Precios | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [openCode, setOpenCode] = useState<PaymentItemCode | null>(null);
  const [payingCode, setPayingCode] = useState<PaymentItemCode | null>(null);

  useEffect(() => {
    fetch('/api/pagos/precios')
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: Precios) => { setPrecios(data); setOpenCode(data.items[0]?.code ?? null); })
      .catch(() => setLoadError(true));
  }, []);

  const handlePagar = async (code: PaymentItemCode) => {
    setPayingCode(code);
    try {
      const res = await fetch('/api/pagos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: code }),
      });
      const data: { initPoint?: string; error?: string } = await res.json();
      if (!res.ok || !data.initPoint) throw new Error(data.error || 'No se pudo iniciar el pago');
      window.location.href = data.initPoint;
    } catch (err: any) {
      toast.error('No pudimos iniciar el pago con Mercado Pago. Probá por WhatsApp mientras lo resolvemos.');
      console.error('[PaymentOptions] checkout falló:', err);
      setPayingCode(null);
    }
  };

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto text-center py-8">
        <p className="text-slate-600 mb-4">No pudimos cargar los precios ahora. Coordinemos tu pago por WhatsApp.</p>
        <a
          href={waLink('Hola, quiero coordinar el pago de mi inscripción')}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-black text-sm hover:bg-green-700 transition-colors"
        >
          Coordinar por WhatsApp
        </a>
      </div>
    );
  }

  if (!precios) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-slate-100 border-t-celeste-strong rounded-full animate-spin" />
      </div>
    );
  }

  const combos = precios.items.filter(i => COMBO_CODES.has(i.code));
  const individuals = precios.items.filter(i => !COMBO_CODES.has(i.code));

  const Card = ({ item, highlight }: { item: PriceItem; highlight?: boolean }) => {
    const isOpen = openCode === item.code;
    const isPaying = payingCode === item.code;
    return (
      <div
        className={`group border-2 rounded-2xl overflow-hidden transition-all duration-500 ease-out ${isOpen
          ? 'border-blue-500 shadow-xl shadow-blue-500/10 bg-white'
          : 'border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-white'
          }`}
      >
        <button
          onClick={() => setOpenCode(isOpen ? null : item.code)}
          className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h5 className="font-black text-xl text-slate-900 tracking-tight">{item.title}</h5>
              {highlight && (
                <span className="bg-celeste-strong text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Más elegido
                </span>
              )}
            </div>
            <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">
              {item.price != null ? formatPrice(item.price) : 'Consultar precio'}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
            <ChevronIcon className="w-5 h-5" />
          </div>
        </button>

        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[900px] opacity-100 border-t border-slate-50' : 'max-h-0 opacity-0'}`}>
          <div className="p-5 pt-6 bg-slate-50/30">
            <p className="text-slate-600 text-sm leading-relaxed font-medium mb-6">{item.description}</p>

            {precios.installments > 1 && precios.installmentsNote && (
              <p className="text-xs text-celeste-strong font-bold bg-celeste-strong/10 rounded-lg px-3 py-2 mb-4">
                💳 Hasta {precios.installments} cuotas sin interés — {precios.installmentsNote}
              </p>
            )}

            <button
              onClick={() => handlePagar(item.code)}
              disabled={isPaying || item.price == null}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-colors mb-4"
            >
              {isPaying ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
            </button>

            <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4 text-sm text-blue-800">
              <strong className="block mb-2 font-bold uppercase tracking-wide text-xs text-blue-600">O por efectivo / transferencia</strong>
              <ul className="space-y-1 list-disc list-inside text-slate-700 mb-3">
                <li><strong>Efectivo:</strong> se abona en la dirección de HOME coordinando por WhatsApp.</li>
                <li><strong>Transferencia:</strong> enviar comprobante por WhatsApp para confirmar.</li>
              </ul>
              <a
                href={waLink(`Hola, quiero pagar ${item.title} en efectivo o transferencia`)}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-green-600 hover:text-green-700 hover:underline"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Coordinar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto text-left py-4">
      <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
        Elige tu plan e inversión
      </h4>

      {combos.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Combos promocionales</p>
          {combos.map((item, idx) => <Card key={item.code} item={item} highlight={idx === 0} />)}
        </div>
      )}

      {individuals.length > 0 && (
        <div className="space-y-4 pt-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Inscripción por etapa</p>
          {individuals.map(item => <Card key={item.code} item={item} />)}
        </div>
      )}

      <div className="mt-4 text-center">
        <a
          href={waLink('Hola, ya realicé el pago de mi inscripción')}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 hover:underline"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Ya pagué, enviar comprobante por WhatsApp
        </a>
      </div>

      <div className="mt-12 p-8 bg-blue-50/50 rounded-[2rem] border-2 border-dashed border-blue-200 text-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 group-hover:opacity-100 transition-opacity"></div>
        <h5 className="text-blue-900 font-black text-lg mb-2 relative z-10">¿Tienes alguna duda con el pago?</h5>
        <p className="text-blue-700/70 text-sm font-medium mb-6 max-w-sm mx-auto relative z-10">
          Estamos aquí para ayudarte. Contáctanos por WhatsApp para coordinar personalmente.
        </p>
        <a
          href={waLink('Hola, tengo una duda con el pago de mi inscripción')}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-white text-blue-600 px-8 py-3 rounded-full font-black text-sm shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all relative z-10"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          Hablar con un coordinador
        </a>
      </div>
    </div>
  );
};

export default PaymentOptions;
