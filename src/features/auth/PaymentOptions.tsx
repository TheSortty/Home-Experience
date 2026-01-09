import React, { useState } from 'react';
import ChevronIcon from '../../ui/icons/ChevronIcon';
import CheckIcon from '../../ui/icons/CheckIcon';

const PaymentOptions: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0); // First one open by default

    const COMBOS = [
        {
            name: 'COMBO 1',
            subtitle: 'INICIAL + AVANZADO',
            description: 'Nuestra recomendación para quienes inician este camino. Incluye las dos etapas fundamentales: El Entrenamiento Inicial donde despertarás tu consciencia, y el Entrenamiento Avanzado para romper barreras y profundizar en tu transformación personal.',
            options: [
                { label: 'Efectivo / Transferencia', price: '$340.000', link: 'https://mpago.la/12TzA5A', type: 'transfer' },
                { label: 'Tarjeta (3 cuotas sin interés)', price: '$480.000', link: 'https://mpago.la/12n2ESQ', type: 'card' }
            ]
        },
        {
            name: 'COMBO 2',
            subtitle: 'INICIAL + AVANZADO + LIDERAZGO',
            description: 'La experiencia completa CRESER. Incluye las tres etapas: Inicial, Avanzado y el programa de Liderazgo integrativo. Diseñado para quienes buscan no solo transformar su vida, sino también consolidar resultados y desarrollar nuevas habilidades.',
            options: [
                { label: 'Efectivo / Transferencia', price: '$630.000', link: 'https://mpago.la/12TzA5A', type: 'transfer' },
                { label: 'Tarjeta (3 cuotas sin interés)', price: '$790.000', link: 'https://mpago.la/12n2ESQ', type: 'card' }
            ]
        }
    ];

    const INDIVIDUALS = [
        {
            name: 'INICIAL',
            duration: '4 días',
            description: 'El despertar. Un espacio de 4 días para identificar creencias limitantes y redescubrir tu potencial.',
            price: '$190.000',
            link: 'https://wa.me/5491122334455?text=Hola,%20quiero%20abonar%20la%20etapa%20INICIAL'
        },
        {
            name: 'AVANZADO',
            duration: '5 días',
            description: 'Cinco días de inmersión para transformar miedos en poder personal y romper barreras.',
            price: '$230.000',
            link: 'https://wa.me/5491122334455?text=Hola,%20quiero%20abonar%20la%20etapa%20AVANZADO'
        },
        {
            name: 'LIDERAZGO',
            duration: '3 meses',
            description: 'La consolidación. Tres meses para aplicar lo aprendido y desarrollar liderazgo en tu vida diaria.',
            price: '$350.000',
            link: 'https://wa.me/5491122334455?text=Hola,%20quiero%20abonar%20la%20etapa%20LIDERAZGO'
        }
    ];

    const toggle = (idx: number) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <div className="space-y-4 max-w-4xl mx-auto text-left py-4">
            <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Elige tu plan e inversión
            </h4>

            {/* COMBOS */}
            <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Combos Promocionales</p>
                {COMBOS.map((combo, idx) => {
                    const isOpen = openIndex === idx;
                    return (
                        <div
                            key={idx}
                            className={`group border-2 rounded-2xl overflow-hidden transition-all duration-500 ease-out ${isOpen
                                ? 'border-blue-500 shadow-xl shadow-blue-500/10 bg-white scale-[1.02] z-10'
                                : 'border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-white'
                                }`}
                        >
                            <button
                                onClick={() => toggle(idx)}
                                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h5 className="font-black text-xl text-slate-900 tracking-tight">{combo.name}</h5>
                                        {idx === 0 && (
                                            <span className="bg-celeste-strong text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                Más Elegido
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">{combo.subtitle}</p>
                                </div>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                    <ChevronIcon className="w-5 h-5" />
                                </div>
                            </button>

                            <div
                                className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100 border-t border-slate-50' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="p-5 pt-6 bg-slate-50/30">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
                                        <p className="text-slate-600 text-sm leading-relaxed font-medium">
                                            {combo.description}
                                        </p>
                                    </div>

                                    {/* INSTRUCCIONES DE PAGO */}
                                    <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4 mb-6 text-sm text-blue-800">
                                        <strong className="block mb-2 font-bold uppercase tracking-wide text-xs text-blue-600">Instrucciones de Pago:</strong>
                                        <ul className="space-y-1 list-disc list-inside text-slate-700">
                                            <li><strong>Efectivo:</strong> Se abona en la dirección de HOME coordinando por WhatsApp.</li>
                                            <li><strong>Transferencia:</strong> Enviar comprobante por WhatsApp para confirmar.</li>
                                        </ul>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {combo.options.map((opt, oIdx) => (
                                            <a
                                                key={oIdx}
                                                href={opt.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex flex-col p-5 rounded-2xl border-2 transition-all duration-300 relative group/btn ${oIdx === 0
                                                    ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-lg'
                                                    : 'bg-white border-slate-200 text-slate-900 hover:border-blue-500 hover:shadow-md'
                                                    }`}
                                            >
                                                <span className={`text-[10px] font-black uppercase tracking-[0.1em] mb-1 ${oIdx === 0 ? 'text-blue-300/80' : 'text-slate-400'}`}>
                                                    {opt.label}
                                                </span>
                                                <span className="text-2xl font-black">{opt.price}</span>
                                                <div className={`mt-4 text-xs font-bold flex items-center gap-1 ${oIdx === 0 ? 'text-white' : 'text-blue-600'}`}>
                                                    Pagar ahora <ChevronIcon className="-rotate-90 w-3 h-3 ml-1 transition-transform group-hover/btn:translate-x-1" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>

                                    {/* BOTÓN WHATSAPP CONFIRMACIÓN */}
                                    <div className="mt-4 text-center">
                                        <a
                                            href="https://wa.me/5491122334455?text=Hola,%20ya%20realic%C3%A9%20el%20pago%20de%20mi%20inscripci%C3%B3n"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 hover:underline"
                                        >
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            Ya pagué, enviar comprobante por WhatsApp
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* INDIVIDUALS */}
            <div className="space-y-4 pt-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Inscripción por Etapa</p>

                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-sm text-orange-800 mb-4 flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <p>Las inscripciones por etapas individuales <strong>SOLO</strong> se pueden abonar mediante <strong>Efectivo o Transferencia</strong>.</p>
                </div>

                <div className="grid gap-3">
                    {INDIVIDUALS.map((item, idx) => {
                        const globalIdx = idx + COMBOS.length;
                        const isOpen = openIndex === globalIdx;
                        return (
                            <div
                                key={idx}
                                className={`group border-2 rounded-2xl overflow-hidden transition-all duration-500 ease-out ${isOpen
                                    ? 'border-slate-800 shadow-xl bg-white scale-[1.01] z-10'
                                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                                    }`}
                            >
                                <button
                                    onClick={() => toggle(globalIdx)}
                                    className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`px-4 py-2 rounded-xl flex flex-col items-center justify-center transition-colors min-w-[80px] ${isOpen ? 'bg-slate-900 text-white' : 'bg-white border border-slate-100 text-slate-600 shadow-sm'}`}>
                                            <span className="text-[9px] font-black uppercase opacity-60 mb-0.5">Duración</span>
                                            <span className="text-xs font-black whitespace-nowrap">{item.duration}</span>
                                        </div>
                                        <div>
                                            <h5 className="font-black text-slate-900 tracking-tight">{item.name}</h5>
                                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Efectivo / Transferencia</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-lg font-black ${isOpen ? 'text-slate-900' : 'text-slate-500'}`}>{item.price}</span>
                                        <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180 text-slate-900' : 'text-slate-300'}`}>
                                            <ChevronIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                </button>

                                <div
                                    className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[400px] opacity-100 border-t border-slate-50' : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    <div className="p-5 bg-slate-50/30">
                                        <p className="text-slate-600 text-sm mb-5 leading-relaxed font-medium italic">
                                            "{item.description}"
                                        </p>

                                        <div className="flex flex-col gap-3">
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-sm hover:bg-green-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                                            >
                                                Coordinar Pago por WhatsApp
                                                <ChevronIcon className="-rotate-90 w-4 h-4 ml-1" />
                                            </a>
                                            <p className="text-xs text-center text-slate-400 px-4">
                                                Al hacer clic, se abrirá un chat con un coordinador para finalizar la inscripción.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="mt-12 p-8 bg-blue-50/50 rounded-[2rem] border-2 border-dashed border-blue-200 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 group-hover:opacity-100 transition-opacity"></div>

                <h5 className="text-blue-900 font-black text-lg mb-2 relative z-10">¿Tienes alguna duda con el pago?</h5>
                <p className="text-blue-700/70 text-sm font-medium mb-6 max-w-sm mx-auto relative z-10">
                    Estamos aquí para ayudarte. Contáctanos por WhatsApp para coordinar personalmente.
                </p>
                <a
                    href="https://wa.me/5491122334455"
                    target="_blank"
                    rel="noopener noreferrer"
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
