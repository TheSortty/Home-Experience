import React, { useState, useEffect, useRef } from 'react';
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
                title: "1. Sembrar el Ser",
                description: "En la quietud de la tierra fértil, plantamos la intención más pura. No es solo crecer, es florecer desde la esencia, rompiendo etiquetas para tocar el cielo con raíces profundas.",
                quote: "Tu verdad florece desde adentro.",
                image: "/images/steps/step_1.jpg"
            },
            {
                id: 2,
                title: "2. El Espejo del Nombre",
                description: "Más allá de las formas, nos encontramos en la mirada del otro. Un nombre no es solo un sonido, es el mantra que nos ancla al presente y nos abre la puerta a la pertenencia.",
                quote: "Reconocerse es el primer acto de amor.",
                image: "/images/steps/step_2.jpg"
            },
            {
                id: 3,
                title: "3. El Calor del Encuentro",
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
                title: "1. Despertar",
                description: "Observar los patrones que nos limitan y empezar a ver lo que antes era invisible. Un salto hacia la lucidez.",
                quote: "El primer paso es ver.",
                image: "/images/programs/placeholder.jpg"
            },
            {
                id: 2,
                title: "2. Alquimia",
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
                title: "1. Conexión",
                description: "Entender que somos en relación. Sanar el vínculo con uno mismo para abrirse genuinamente al otro.",
                quote: "Soy porque somos.",
                image: "/images/programs/vincularte.jpg"
            },
            {
                id: 2,
                title: "2. 共鳴 (Resonancia)",
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

const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({ programId, onClose, onBack, onStartRegistration }) => {
    const [activeStage, setActiveStage] = useState(0);
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const modalRef = useRef<HTMLDivElement>(null);

    const detail = programId ? PROGRAM_DETAILS[programId] : null;

    useEffect(() => {
        if (!detail) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute('data-index'));
                        setActiveStage(index);
                    }
                });
            },
            {
                root: modalRef.current,
                rootMargin: '-50% 0px -50% 0px',
                threshold: 0
            }
        );

        sectionRefs.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [detail]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!detail) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-0 md:p-6 bg-slate-900 backdrop-blur-3xl animate-fade-in"
            data-lenis-prevent
        >
            <div
                className="relative w-full h-full md:max-w-7xl md:h-[90vh] bg-white md:rounded-[3rem] shadow-2xl overflow-hidden"
            >
            <div
                ref={modalRef}
                className="w-full h-full overflow-y-auto overflow-x-hidden modal-scrollbar"
            >
                {/* Back Button */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="fixed top-6 left-6 z-[110] p-4 bg-white/10 hover:bg-white/20 text-white md:text-slate-900 md:bg-slate-100 md:hover:bg-slate-200 rounded-full transition-all backdrop-blur-md group"
                    >
                        <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                )}
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="fixed top-6 right-6 z-[110] p-4 bg-white/10 hover:bg-white/20 text-white md:text-slate-900 md:bg-slate-100 md:hover:bg-slate-200 rounded-full transition-all backdrop-blur-md"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="container mx-auto px-6 py-12 md:py-24">
                    <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">

                        {/* Left Column: Scrolling Text */}
                        <div className="lg:w-1/2">
                            <div className="mb-20">
                                <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-4">{detail.name}</h2>
                                <p className="text-xl text-slate-500 italic">{detail.tagline}</p>
                            </div>

                            {detail.stages.map((stage, index) => (
                                <div
                                    key={stage.id}
                                    ref={(el) => (sectionRefs.current[index] = el)}
                                    data-index={index}
                                    className={`flex flex-col justify-center transition-all duration-1000 py-[30vh] min-h-[80vh] ${activeStage === index ? 'opacity-100 blur-0' : 'opacity-20 blur-sm'
                                        }`}
                                >
                                    <span className="text-sm font-bold tracking-[0.3em] text-slate-400 mb-6 uppercase">
                                        MODULO 0{stage.id}
                                    </span>
                                    <h3 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-8 leading-tight">
                                        {stage.title.includes('. ') ? stage.title.split('. ')[1] : stage.title}
                                    </h3>

                                    {/* Mobile Image */}
                                    <div className="lg:hidden mb-12 w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                                        <img src={stage.image} alt={stage.title} className="w-full h-full object-cover" />
                                    </div>

                                    <p className="text-xl md:text-2xl text-slate-600 leading-relaxed font-light">
                                        {stage.description}
                                    </p>

                                    {/* Special Button for CreSER on last stage */}
                                    {detail.id === 'creser' && index === detail.stages.length - 1 && (
                                        <button
                                            onClick={onStartRegistration}
                                            className="mt-12 group flex items-center gap-4 px-8 py-5 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-celeste-strong transition-all shadow-xl hover:shadow-celeste-strong/30"
                                        >
                                            Comenzar Inscripción
                                            <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Right Column: Sticky Image (Desktop) */}
                        <div className="lg:w-1/2 relative hidden lg:block">
                            <div className="sticky top-12 h-[calc(80vh-6rem)] flex items-center justify-center">
                                <div className="relative w-full max-w-[500px] aspect-[4/5] rounded-[3rem] shadow-2xl overflow-hidden bg-slate-100">
                                    {detail.stages.map((stage, index) => (
                                        <div
                                            key={stage.id}
                                            className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${activeStage === index ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
                                                }`}
                                        >
                                            <img src={stage.image} alt={stage.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                                            <div className="absolute bottom-16 left-12 right-12 text-white">
                                                <p className="text-2xl font-serif italic text-center opacity-90 leading-relaxed">
                                                    "{stage.quote}"
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Progress Indicator */}
                                    <div className="absolute top-12 left-0 w-full px-12 z-20">
                                        <div className="flex gap-2">
                                            {detail.stages.map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= activeStage ? 'bg-white' : 'bg-white/20'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default ProgramDetailModal;
