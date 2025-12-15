import React from 'react';

interface PackagesProps {
    onRegisterClick: () => void;
}

const Packages: React.FC<PackagesProps> = ({ onRegisterClick }) => {
    return (
        <section id="pricing" className="py-20 px-4 md:px-6 relative overflow-hidden bg-white">
            <div className="w-full max-w-[95%] xl:max-w-[1400px] mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-black-soft mb-6">Inversión</h2>
                    <p className="text-grey-smoke max-w-2xl mx-auto text-lg">
                        Invierte en tu transformación. Elige la opción que mejor se adapte a tu compromiso.
                    </p>
                </div>

                {/* COMBOS SECTION */}
                <div className="mb-20">
                    <h3 className="text-xl font-bold text-center text-black-soft mb-8 uppercase tracking-widest">Combos Promocionales</h3>
                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* COMBO 1 */}
                        <div className="bg-black-soft text-white rounded-[2rem] p-8 md:p-10 relative overflow-hidden shadow-2xl hover:scale-[1.01] transition-transform duration-300 group">
                            <div className="absolute top-0 right-0 bg-celeste-strong text-white text-xs font-bold px-4 py-2 rounded-bl-xl uppercase tracking-wider shadow-lg z-10">
                                Más elegido
                            </div>

                            {/* Glow Effect */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-celeste-strong/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-celeste-strong/30 transition-colors"></div>

                            <div className="mb-8 relative z-10">
                                <h4 className="text-3xl font-serif font-bold mb-2">COMBO 1</h4>
                                <p className="text-celeste-soft font-medium tracking-wide">INICIAL + AVANZADO</p>
                            </div>

                            <div className="space-y-5 mb-8 relative z-10">
                                <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                                    <span className="text-grey-pearl">Tarjeta (3 cuotas)</span>
                                    <span className="text-2xl font-bold">$480.000</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                                    <span className="text-celeste-soft font-bold">Efectivo / Transferencia</span>
                                    <span className="text-3xl font-bold text-celeste-soft">$340.000</span>
                                </div>
                            </div>

                            <button onClick={onRegisterClick} className="w-full py-4 bg-white text-black-soft rounded-xl font-bold hover:bg-sand-light transition-colors relative z-10">
                                Elegir Combo 1
                            </button>
                        </div>

                        {/* COMBO 2 */}
                        <div className="bg-grey-smoke text-white rounded-[2rem] p-8 md:p-10 relative overflow-hidden shadow-xl hover:scale-[1.01] transition-transform duration-300 border border-white/10 group">
                            {/* Glow Effect */}
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-white/20 transition-colors"></div>

                            <div className="mb-8 relative z-10">
                                <h4 className="text-3xl font-serif font-bold mb-2">COMBO 2</h4>
                                <p className="text-celeste-soft font-medium tracking-wide">INICIAL + AVANZADO + LIDERAZGO</p>
                            </div>

                            <div className="space-y-5 mb-8 relative z-10">
                                <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                                    <span className="text-grey-pearl">Tarjeta (3 cuotas)</span>
                                    <span className="text-2xl font-bold">$790.000</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                                    <span className="text-celeste-soft font-bold">Efectivo / Transferencia</span>
                                    <span className="text-3xl font-bold text-celeste-soft">$630.000</span>
                                </div>
                            </div>

                            <button onClick={onRegisterClick} className="w-full py-4 bg-celeste-strong text-white rounded-xl font-bold hover:bg-celeste-soft transition-colors shadow-lg shadow-celeste-strong/20 relative z-10">
                                Elegir Combo 2
                            </button>
                        </div>
                    </div>
                </div>

                {/* INDIVIDUAL PACKAGES */}
                <div className="max-w-5xl mx-auto">
                    <h3 className="text-xl font-bold text-center text-black-soft mb-8 uppercase tracking-widest pl-2">Etapas Individuales</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { name: 'INICIAL', price: '$190.000', parts: '4 días', desc: 'El despertar.' },
                            { name: 'AVANZADO', price: '$230.000', parts: '5 días', desc: 'La transformación.' },
                            { name: 'LIDERAZGO', price: '$350.000', parts: '3 meses', desc: 'La consolidación.' }
                        ].map((pkg, idx) => (
                            <div key={idx} className="bg-sand-light/20 p-8 rounded-[2rem] border border-sand-medium/40 hover:border-celeste-strong/30 hover:bg-sand-light/40 transition-all duration-300 group">
                                <div className="mb-4">
                                    <h4 className="font-bold text-xl text-black-soft mb-2 font-serif">{pkg.name}</h4>
                                    <p className="text-sm text-grey-smoke">{pkg.desc}</p>
                                </div>

                                <div className="flex flex-col items-start gap-1 mb-4">
                                    <span className="text-3xl font-bold text-celeste-strong">{pkg.price}</span>
                                    <span className="text-xs text-grey-smoke uppercase tracking-wide bg-white px-2 py-1 rounded-md border border-sand-medium/30">{pkg.parts}</span>
                                </div>

                                <div className="pt-4 border-t border-sand-medium/30">
                                    <p className="text-xs text-grey-smoke flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-celeste-strong">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                                        </svg>
                                        Solo efectivo o transferencia
                                    </p>
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