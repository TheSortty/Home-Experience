import React from 'react';
import CheckIcon from '../../ui/icons/CheckIcon';

interface PackagesProps {
    onRegisterClick: () => void;
}

const Packages: React.FC<PackagesProps> = ({ onRegisterClick }) => {
    return (
        <section id="pricing" className="py-24 px-4 md:px-6 relative overflow-hidden">


            <div className="container mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-6">Inversión</h2>
                    <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                        Invierte en tu transformación. Elige la opción que mejor se adapte a tu compromiso.
                    </p>
                </div>

                {/* COMBOS SECTION */}
                <div className="mb-20">
                    <h3 className="text-2xl font-bold text-center text-slate-900 mb-8 uppercase tracking-widest">Combos Promocionales</h3>
                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        <div className="bg-slate-900 text-white rounded-[2rem] p-8 md:p-10 relative overflow-hidden shadow-2xl hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wider">
                                Más elegido
                            </div>
                            <div className="mb-6">
                                <h4 className="text-3xl font-serif font-bold mb-2">COMBO 1</h4>
                                <p className="text-blue-400 font-medium">INICIAL + AVANZADO</p>
                            </div>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-baseline border-b border-slate-700 pb-2">
                                    <span className="text-slate-300">Tarjeta (3 cuotas)</span>
                                    <span className="text-2xl font-bold">$480.000</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b border-slate-700 pb-2">
                                    <span className="text-green-400 font-bold">Efectivo / Transferencia</span>
                                    <span className="text-3xl font-bold text-green-400">$340.000</span>
                                </div>
                            </div>
                            <button onClick={onRegisterClick} className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-blue-50 transition-colors">
                                Elegir Combo 1
                            </button>
                        </div>

                        <div className="bg-slate-800 text-white rounded-[2rem] p-8 md:p-10 relative overflow-hidden shadow-xl hover:scale-[1.02] transition-transform duration-300 border border-slate-700">
                            <div className="mb-6">
                                <h4 className="text-3xl font-serif font-bold mb-2">COMBO 2</h4>
                                <p className="text-blue-400 font-medium">INICIAL + AVANZADO + LIDERAZGO</p>
                            </div>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-baseline border-b border-slate-600 pb-2">
                                    <span className="text-slate-300">Tarjeta (3 cuotas)</span>
                                    <span className="text-2xl font-bold">$740.000</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b border-slate-600 pb-2">
                                    <span className="text-green-400 font-bold">Efectivo / Transferencia</span>
                                    <span className="text-3xl font-bold text-green-400">$630.000</span>
                                </div>
                            </div>
                            <button onClick={onRegisterClick} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                                Elegir Combo 2
                            </button>
                        </div>
                    </div>
                </div>

                {/* INDIVIDUAL PACKAGES */}
                <div className="mb-20 max-w-6xl mx-auto">
                    <h3 className="text-xl font-bold text-center text-slate-900 mb-8 uppercase tracking-widest">Etapas Individuales</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { name: 'INICIAL', price: '$190.000', parts: '4 días', desc: 'El despertar. Jueves a Domingo.' },
                            { name: 'AVANZADO', price: '$230.000', parts: '5 días', desc: 'La transformación. Miércoles a Domingo.' },
                            { name: 'LIDERAZGO', price: '$350.000', parts: '3 meses', desc: 'La consolidación. 3 fines de semana.' }
                        ].map((pkg, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <h4 className="font-bold text-lg text-slate-900 mb-1">{pkg.name}</h4>
                                <p className="text-sm text-slate-500 mb-4">{pkg.desc}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-blue-600">{pkg.price}</span>
                                    <span className="text-xs text-slate-400">/ {pkg.parts}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PAYMENT METHODS INFO */}
                <div className="max-w-4xl mx-auto">
                    <h3 className="text-xl font-bold text-center text-slate-900 mb-8 uppercase tracking-widest">Medios de Pago</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75a.75.75 0 00-.75.75v.75M3.75 18.75h.75a.75.75 0 01.75.75v.75m0 0a.75.75 0 01-.75.75h-.75m0-1.5h.75m16.5-1.5h.75a.75.75 0 01.75.75v.75m0 0a.75.75 0 01-.75.75h-.75m0-1.5h.75" />
                                </svg>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">Transferencia o Depósito</h4>
                            <p className="text-slate-600 text-sm mb-4">Obtén el precio promocional abonando por transferencia.</p>
                            <div className="bg-slate-50 px-4 py-2 rounded-lg font-mono text-sm text-slate-700">
                                Alias: <span className="font-bold">homedh.mp</span>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                                </svg>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">Tarjeta de Crédito</h4>
                            <p className="text-slate-600 text-sm mb-4">Hasta 3 cuotas sin interés con todas las tarjetas.</p>
                            <p className="text-xs text-slate-400">Links de pago disponibles al finalizar la inscripción.</p>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default Packages;