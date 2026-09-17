'use client';

import React, { useState } from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import type { PaymentItemCode } from '../../services/pricing';

interface PackagesProps {
    onRegisterClick: () => void;
}

/** Vigencia de la promo, para no mostrar un cartel vencido si nadie lo apaga. */
function promoIsLive(until: string): boolean {
    if (!until) return false;
    const end = new Date(`${until}T23:59:59-03:00`);
    if (Number.isNaN(end.getTime())) return false;
    return Date.now() <= end.getTime();
}

const Packages: React.FC<PackagesProps> = ({ onRegisterClick }) => {
    const { getValue, loading } = useSiteSettings();
    const [pendingItem, setPendingItem] = useState<PaymentItemCode | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    // Un solo precio por ítem: el recargo por tarjeta y cuotas lo aplica
    // Mercado Pago, así que no hay una lista "tarjeta" que mantener acá.
    const priceCombo1 = getValue('price_combo_1_cash', '480.000');
    const priceCombo2 = getValue('price_combo_2_cash', '820.000');
    const priceInitial = getValue('price_initial', '280.000');
    const priceAdvanced = getValue('price_advanced', '300.000');
    const priceLeadership = getValue('price_leadership', '450.000');

    const promoNote = getValue('promo_installments_note', '');
    const promoUntil = getValue('promo_installments_until', '');
    const showPromo = Boolean(promoNote) && promoIsLive(promoUntil);

    const fmt = (val: string) => (val.startsWith('$') ? val : `$${val}`);

    /**
     * El navegador manda sólo el código del ítem. El precio lo resuelve el
     * servidor contra site_settings: si el monto viajara desde acá, se podría
     * editar antes de llegar a Mercado Pago.
     */
    const startCheckout = async (item: PaymentItemCode) => {
        setPendingItem(item);
        setCheckoutError(null);
        try {
            const response = await fetch('/api/pagos/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item }),
            });
            const data = (await response.json().catch(() => null)) as
                { initPoint?: string; error?: string } | null;
            if (!response.ok || !data?.initPoint) {
                throw new Error(data?.error || 'No se pudo iniciar el pago');
            }
            window.location.href = data.initPoint;
        } catch (err) {
            console.error('[pagos] checkout falló', err);
            setCheckoutError(
                err instanceof Error ? err.message : 'No se pudo iniciar el pago',
            );
            setPendingItem(null);
        }
    };

    const PayButton: React.FC<{ item: PaymentItemCode; className: string }> = ({ item, className }) => (
        <button
            onClick={() => startCheckout(item)}
            disabled={pendingItem !== null}
            className={`${className} disabled:opacity-60 disabled:cursor-wait`}
        >
            {pendingItem === item ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
        </button>
    );

    return (
        <section id="pricing" className="py-20 px-4 md:px-6 relative overflow-hidden bg-white">
            <div className="w-full max-w-[95%] xl:max-w-[1400px] mx-auto relative z-10">
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-black-soft mb-6">Inversión</h2>
                    <p className="text-grey-smoke max-w-2xl mx-auto text-lg">
                        Invierte en tu transformación. Elige la opción que mejor se adapte a tu compromiso.
                    </p>
                </div>

                {showPromo && (
                    <div className="max-w-3xl mx-auto mb-14">
                        <div className="flex items-center gap-3 justify-center text-center bg-celeste-strong/10 border border-celeste-strong/30 text-celeste-strong rounded-2xl px-6 py-4">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                                <path d="M1 4.25A2.25 2.25 0 013.25 2h13.5A2.25 2.25 0 0119 4.25v1.5H1v-1.5zM1 7.25h18v8.5A2.25 2.25 0 0116.75 18H3.25A2.25 2.25 0 011 15.75v-8.5zm3 5a.75.75 0 000 1.5h4a.75.75 0 000-1.5H4z" />
                            </svg>
                            <p className="font-bold text-sm md:text-base">{promoNote}</p>
                        </div>
                    </div>
                )}

                {checkoutError && (
                    <div className="max-w-3xl mx-auto mb-10">
                        <p className="text-center text-sm bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3">
                            {checkoutError}. Escribinos y lo resolvemos.
                        </p>
                    </div>
                )}

                {/* COMBOS */}
                <div className="mb-20">
                    <h3 className="text-xl font-bold text-center text-black-soft mb-8 uppercase tracking-widest">Combos Promocionales</h3>
                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* COMBO 1 */}
                        <div className="bg-black-soft text-white rounded-[2rem] p-8 md:p-10 relative overflow-hidden shadow-2xl hover:scale-[1.01] transition-transform duration-300 group">
                            <div className="absolute top-0 right-0 bg-celeste-strong text-white text-xs font-bold px-4 py-2 rounded-bl-xl uppercase tracking-wider shadow-lg z-10">
                                Más elegido
                            </div>

                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-celeste-strong/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-celeste-strong/30 transition-colors"></div>

                            <div className="mb-8 relative z-10">
                                <h4 className="text-3xl font-serif font-bold mb-2">COMBO 1</h4>
                                <p className="text-celeste-soft font-medium tracking-wide">INICIAL + AVANZADO</p>
                            </div>

                            <div className="mb-8 relative z-10 border-b border-white/10 pb-6">
                                <span className="block text-5xl font-bold text-celeste-soft">{loading ? '...' : fmt(priceCombo1)}</span>
                                <span className="block text-sm text-grey-pearl mt-2">Efectivo, transferencia, depósito o tarjeta</span>
                            </div>

                            <div className="space-y-3 relative z-10">
                                <PayButton item="combo_1" className="w-full py-4 bg-celeste-strong text-white rounded-xl font-bold hover:bg-celeste-soft transition-colors shadow-lg shadow-celeste-strong/20" />
                                <button onClick={onRegisterClick} className="w-full py-3 bg-transparent border border-white/25 text-white rounded-xl font-medium hover:bg-white/10 transition-colors">
                                    Quiero que me contacten
                                </button>
                            </div>
                        </div>

                        {/* COMBO 2 */}
                        <div className="bg-grey-smoke text-white rounded-[2rem] p-8 md:p-10 relative overflow-hidden shadow-xl hover:scale-[1.01] transition-transform duration-300 border border-white/10 group">
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-white/20 transition-colors"></div>

                            <div className="mb-8 relative z-10">
                                <h4 className="text-3xl font-serif font-bold mb-2">COMBO 2</h4>
                                <p className="text-celeste-soft font-medium tracking-wide">INICIAL + AVANZADO + LIDERAZGO</p>
                            </div>

                            <div className="mb-8 relative z-10 border-b border-white/10 pb-6">
                                <span className="block text-5xl font-bold text-celeste-soft">{loading ? '...' : fmt(priceCombo2)}</span>
                                <span className="block text-sm text-grey-pearl mt-2">Efectivo, transferencia, depósito o tarjeta</span>
                            </div>

                            <div className="space-y-3 relative z-10">
                                <PayButton item="combo_2" className="w-full py-4 bg-white text-black-soft rounded-xl font-bold hover:bg-sand-light transition-colors" />
                                <button onClick={onRegisterClick} className="w-full py-3 bg-transparent border border-white/25 text-white rounded-xl font-medium hover:bg-white/10 transition-colors">
                                    Quiero que me contacten
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ETAPAS INDIVIDUALES */}
                <div className="max-w-5xl mx-auto">
                    <h3 className="text-xl font-bold text-center text-black-soft mb-8 uppercase tracking-widest pl-2">Etapas Individuales</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        {([
                            { item: 'initial', name: 'INICIAL', price: priceInitial, parts: '4 días', desc: 'El despertar.' },
                            { item: 'advanced', name: 'AVANZADO', price: priceAdvanced, parts: '5 días', desc: 'La transformación.' },
                            { item: 'leadership', name: 'LIDERAZGO', price: priceLeadership, parts: '3 meses', desc: 'La consolidación.' },
                        ] as const).map(pkg => (
                            <div key={pkg.item} className="bg-sand-light/20 p-8 rounded-[2rem] border border-sand-medium/40 hover:border-celeste-strong/30 hover:bg-sand-light/40 transition-all duration-300 flex flex-col">
                                <div className="mb-4">
                                    <h4 className="font-bold text-xl text-black-soft mb-2 font-serif">{pkg.name}</h4>
                                    <p className="text-sm text-grey-smoke">{pkg.desc}</p>
                                </div>

                                <div className="flex flex-col items-start gap-1 mb-6">
                                    <span className="text-3xl font-bold text-celeste-strong">{loading ? '...' : fmt(pkg.price)}</span>
                                    <span className="text-xs text-grey-smoke uppercase tracking-wide bg-white px-2 py-1 rounded-md border border-sand-medium/30">{pkg.parts}</span>
                                </div>

                                <div className="mt-auto pt-4 border-t border-sand-medium/30">
                                    <PayButton item={pkg.item} className="w-full py-3 bg-celeste-strong text-white rounded-xl font-bold text-sm hover:bg-celeste-soft transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Packages;
