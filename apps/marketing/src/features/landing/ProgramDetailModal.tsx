import React, { useState, useEffect, useCallback } from 'react';
import ArrowRightIcon from '../../ui/icons/ArrowRightIcon';

interface ProgramStage {
    id: number;
    title: string;
    description: string;
    quote: string;
    image: string;
}

interface ProgramDetail {
    id: string;
    name: string;
    tagline: string;
    stages: ProgramStage[];
    color: string;
}

const PROGRAM_DETAILS: Record<string, ProgramDetail> = {
    creser: {
        id: 'creser',
        name: 'Programa CreSER',
        tagline: 'El viaje hacia tu mejor versión',
        color: '#00A3E0',
        stages: [
            {
                id: 1,
                title: "Sembrar el Ser",
                description: "En la quietud de la tierra fértil, plantamos la intención más pura. No es solo crecer, es florecer desde la esencia, rompiendo etiquetas para tocar el cielo con raíces profundas.",
                quote: "Tu verdad florece desde adentro.",
                image: "/images/steps/step_1.jpg"
            },
            {
                id: 2,
                title: "El Espejo del Nombre",
                description: "Más allá de las formas, nos encontramos en la mirada del otro. Un nombre no es solo un sonido, es el mantra que nos ancla al presente y nos abre la puerta a la pertenencia.",
                quote: "Reconocerse es el primer acto de amor.",
                image: "/images/steps/step_2.jpg"
            },
            {
                id: 3,
                title: "El Calor del Encuentro",
                description: "El ritual sagrado de compartir. Donde el tiempo se detiene y las almas conversan sin prisa, mano a mano, tejiendo la red invisible que nos sostiene a todos.",
                quote: "En cada gesto, somos uno.",
                image: "/images/steps/step_3.jpg"
            }
        ]
    },
    evolucion: {
        id: 'evolucion',
        name: 'Programa Evolución',
        tagline: 'Expandiendo los límites de tu conciencia',
        color: '#005596',
        stages: [
            {
                id: 1,
                title: "Despertar",
                description: "Observar los patrones que nos limitan y empezar a ver lo que antes era invisible. Un salto hacia la lucidez.",
                quote: "El primer paso es ver.",
                image: "/images/programs/evolucion.jpg"
            },
            {
                id: 2,
                title: "Alquimia",
                description: "Transformar el lenguaje y las emociones para crear una nueva realidad. Rediseñando el SER.",
                quote: "Tus palabras crean mundos.",
                image: "/images/programs/creser.jpg"
            }
        ]
    },
    vincularte: {
        id: 'vincularte',
        name: 'Programa Vincularte',
        tagline: 'El arte de encontrarnos',
        color: '#003358',
        stages: [
            {
                id: 1,
                title: "Conexión",
                description: "Entender que somos en relación. Sanar el vínculo con uno mismo para abrirse genuinamente al otro.",
                quote: "Soy porque somos.",
                image: "/images/programs/vincularte.jpg"
            },
            {
                id: 2,
                title: "Resonancia",
                description: "Crear sintonía y empatía profunda. Escuchar lo que no se dice y hablar desde el corazón.",
                quote: "Escuchar es un acto sagrado.",
                image: "/images/impact/social.jpg"
            }
        ]
    }
};

interface ProgramDetailModalProps {
    programId: string | null;
    onClose: () => void;
    onBack?: () => void;
    onStartRegistration?: () => void;
}

const STORY_DURATION = 8000; // 8 seconds per slide

const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({ programId, onClose, onBack, onStartRegistration }) => {
    const [activeStage, setActiveStage] = useState(0);
    const [progress, setProgress] = useState(0);

    const detail = programId ? PROGRAM_DETAILS[programId] : null;
    const stagesCount = detail?.stages.length || 0;

    const handleNext = useCallback(() => {
        if (activeStage < stagesCount - 1) {
            setActiveStage(prev => prev + 1);
            setProgress(0);
        } else {
            // Reached the end, maybe close or stop
            setActiveStage(stagesCount - 1);
            setProgress(100);
        }
    }, [activeStage, stagesCount]);

    const handlePrev = useCallback(() => {
        if (activeStage > 0) {
            setActiveStage(prev => prev - 1);
            setProgress(0);
        } else {
            setActiveStage(0);
            setProgress(0);
        }
    }, [activeStage]);

    // Timer for auto-advance progress
    useEffect(() => {
        if (!detail) return;
        if (activeStage >= stagesCount - 1 && progress >= 100) return; // Stop at end

        const interval = 50; // Update every 50ms
        const step = (100 / STORY_DURATION) * interval;

        const timer = setInterval(() => {
            setProgress(p => {
                if (p + step >= 100) {
                    clearInterval(timer);
                    // Defer next tick to avoid state updates during render phase
                    setTimeout(handleNext, 0);
                    return 100;
                }
                return p + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [activeStage, detail, handleNext, stagesCount, progress]);

    // Handle ESC and arrows
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, handleNext, handlePrev]);

    if (!detail) return null;

    const currentStage = detail.stages[activeStage];

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-0 md:p-8 bg-[#11131a] backdrop-blur-3xl animate-fade-in"
            data-lenis-prevent
        >
            <div
                className="relative w-full h-full md:max-w-[1200px] md:h-[85vh] bg-white md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Top Action Buttons (Sticky/Absolute) */}
                <div className="absolute top-6 left-6 right-6 z-50 flex justify-between pointer-events-none">
                    {onBack ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); onBack(); }}
                            className="w-12 h-12 flex items-center justify-center bg-white/80 hover:bg-white text-slate-700 rounded-full shadow-md transition-all backdrop-blur-md pointer-events-auto"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                    ) : <div></div>}

                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="w-12 h-12 flex items-center justify-center bg-white/80 hover:bg-white text-slate-700 rounded-full shadow-md transition-all backdrop-blur-md pointer-events-auto"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Main Content Split */}
                <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
                    
                    {/* Left: Text Content */}
                    <div className="lg:w-[45%] h-[50vh] lg:h-full p-8 md:p-16 flex flex-col justify-center relative overflow-y-auto custom-scrollbar">
                        {/* Static Header */}
                        <div className="mb-12 md:mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-2 tracking-[-0.02em]">
                                {detail.name}
                            </h2>
                            <p className="text-lg text-slate-500 italic font-serif">
                                {detail.tagline}
                            </p>
                        </div>

                        {/* Dynamic Stage Info */}
                        <div className="flex-grow flex flex-col justify-center">
                            <span className="text-xs font-bold tracking-[0.2em] text-slate-400 mb-4 uppercase">
                                MODULO {String(currentStage.id).padStart(2, '0')}
                            </span>
                            <h3 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-[-0.02em] font-serif">
                                {currentStage.title}
                            </h3>
                            <p className="text-lg md:text-[1.35rem] text-slate-600 leading-[1.6] font-light md:pr-8">
                                {currentStage.description}
                            </p>
                        </div>

                        {/* CTA appearing on the last step, or implicitly available */}
                        <div className={`mt-10 transition-all duration-700 ${activeStage === stagesCount - 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                            {onStartRegistration && (
                                <button
                                    onClick={onStartRegistration}
                                    className="group flex items-center justify-between w-full md:w-auto gap-6 px-8 py-4 bg-[#1B2134] text-white rounded-full font-bold text-sm tracking-wider uppercase hover:bg-celeste-strong transition-all shadow-xl"
                                >
                                    {detail.id === 'creser' ? 'Comenzar Inscripción' : 'Consultar por WhatsApp'}
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Image Stories Container */}
                    <div className="lg:w-[55%] h-[50vh] lg:h-full relative bg-slate-100 lg:p-6 overflow-hidden">
                        {/* The Image Wrapper */}
                        <div className="w-full h-full relative lg:rounded-3xl overflow-hidden shadow-2xl group">
                            
                            {/* Images Stack */}
                            {detail.stages.map((stage, idx) => (
                                <div
                                    key={stage.id}
                                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${activeStage === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                >
                                    <img 
                                        src={stage.image} 
                                        alt={stage.title} 
                                        className={`w-full h-full object-cover transition-transform duration-[10000ms] ${activeStage === idx ? 'scale-105' : 'scale-100'}`} 
                                    />
                                    {/* Quote Overlay */}
                                    <div className="absolute inset-x-0 bottom-0 pt-32 pb-12 px-10 bg-gradient-to-t from-[#11131a]/90 via-[#11131a]/40 to-transparent flex items-end justify-center">
                                        <p className="text-white font-serif italic text-xl md:text-2xl text-center opacity-90 drop-shadow-md">
                                            "{stage.quote}"
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Stories Indicators */}
                            <div className="absolute top-6 left-6 right-6 z-20 flex gap-2">
                                {detail.stages.map((_, idx) => (
                                    <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                                        <div 
                                            className="h-full bg-white rounded-full transition-all ease-linear"
                                            style={{ 
                                                width: idx < activeStage ? '100%' : idx === activeStage ? `${progress}%` : '0%',
                                                transitionDuration: idx === activeStage && progress > 0 ? '50ms' : '300ms'
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Click Navigation Zones */}
                            <div className="absolute inset-0 z-20 flex w-full h-full">
                                <div 
                                    className="w-1/3 h-full cursor-w-resize" 
                                    onClick={handlePrev}
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                />
                                <div 
                                    className="w-2/3 h-full cursor-e-resize" 
                                    onClick={handleNext} 
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                />
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgramDetailModal;
