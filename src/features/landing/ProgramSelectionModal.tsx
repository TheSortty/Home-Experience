import React from 'react';
import SparkleIcon from '../../ui/icons/SparkleIcon';
import ArrowRightIcon from '../../ui/icons/ArrowRightIcon';

interface ProgramSelectionModalProps {
    onClose: () => void;
    onSelectProgram: (id: string) => void;
    onStartRegistration: () => void;
}

const programs = [
    {
        id: 'creser',
        name: 'CreSER',
        tagline: 'Programa Estrella',
        description: 'Transformación profunda y resultados extraordinarios.',
        image: '/images/IMAGENES WEB/DSC01212.jpg',
        color: 'from-celeste-strong to-blue-600',
        star: true,
    },
    {
        id: 'evolucion',
        name: 'Evolución',
        tagline: 'Proceso Consciente',
        description: 'Acompañamiento reflexivo para una vida coherente.',
        image: '/images/IMAGENES WEB/DSC01510.jpg',
        color: 'from-blue-600 to-slate-900',
        star: false,
    },
    {
        id: 'vincularte',
        name: 'Vincularte',
        tagline: 'Relaciones Sanas',
        description: 'Explora y transforma tu forma de conectar con otros.',
        image: '/images/IMAGENES WEB/DSC01681.jpg',
        color: 'from-slate-700 to-slate-900',
        star: false,
    }
];

const ProgramSelectionModal: React.FC<ProgramSelectionModalProps> = ({ onClose, onSelectProgram, onStartRegistration }) => {
    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8 bg-slate-900/90 backdrop-blur-xl animate-fade-in"
            data-lenis-prevent
        >
            <div
                className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-[3rem] shadow-2xl overflow-y-auto scrollbar-hide"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 z-20 p-2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-8 md:p-16">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">¿Por dónde quieres empezar?</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Selecciona el programa que mejor se adapte a tu momento actual.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {programs.map((program) => (
                            <div
                                key={program.id}
                                className={`relative group cursor-pointer rounded-[2.5rem] overflow-hidden transition-all duration-500 ${program.star ? 'md:scale-105 shadow-2xl ring-4 ring-celeste-strong/20' : 'hover:scale-[1.02] shadow-xl'
                                    }`}
                                onClick={() => onSelectProgram(program.id)}
                            >
                                {/* Image Background */}
                                <div className="h-96 relative">
                                    <img src={program.image} alt={program.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className={`absolute inset-0 bg-gradient-to-t ${program.star ? 'from-celeste-strong/90 via-slate-900/40' : 'from-slate-900/90'} to-transparent opacity-80 group-hover:opacity-90 transition-opacity`}></div>

                                    {program.star && (
                                        <div className="absolute top-6 left-6 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center gap-2">
                                            <SparkleIcon className="w-4 h-4 text-white" />
                                            <span className="text-xs font-bold text-white uppercase tracking-widest">Favorito</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-x-0 bottom-0 p-8 text-white">
                                        <span className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2 block">{program.tagline}</span>
                                        <h3 className="text-3xl font-bold mb-4">{program.name}</h3>
                                        <p className="text-sm opacity-90 line-clamp-2 mb-6">{program.description}</p>

                                        <button className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider group-hover:gap-5 transition-all">
                                            Explorar programa
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Star Hover Effect */}
                                {program.star && (
                                    <div className="absolute inset-0 pointer-events-none border-4 border-transparent group-hover:border-white/20 rounded-[2.5rem] transition-all"></div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Quick Registration for CreSER */}
                    <div className="mt-16 p-8 md:p-12 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-celeste-strong/10 rounded-2xl flex items-center justify-center">
                                <SparkleIcon className="w-8 h-8 text-celeste-strong" />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 mb-1">¿Listo para la transformación?</h4>
                                <p className="text-slate-500">Inscríbete ahora en el próximo ciclo de CreSER.</p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onStartRegistration();
                            }}
                            className="px-10 py-5 bg-slate-900 text-white rounded-full font-bold shadow-xl hover:shadow-2xl hover:bg-celeste-strong transition-all flex items-center gap-3"
                        >
                            Comenzar Inscripción CreSER
                            <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgramSelectionModal;
