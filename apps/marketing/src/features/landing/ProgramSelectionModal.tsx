import React, { useState } from 'react';
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
        tagline: 'PROGRAMA ESTRELLA',
        description: 'Una experiencia transformadora para rediseñar tu forma de ser y actuar en el mundo. El programa más completo y profundo.',
        image: '/images/programs/creser.jpg',
        isMain: true,
    },
    {
        id: 'evolucion',
        name: 'Evolución',
        tagline: 'PROCESO CONSCIENTE',
        description: 'Un acompañamiento reflexivo continuo para mantener y profundizar los cambios en tu vida cotidiana.',
        image: '/images/programs/evolucion.jpg',
        isMain: false,
    },
    {
        id: 'vincularte',
        name: 'Vincularte',
        tagline: 'RELACIONES SANAS',
        description: 'Explorá y transformá tu forma de vincularte y conectar con los demás de manera sana y nutritiva.',
        image: '/images/programs/vincularte.jpg',
        isMain: false,
    }
];

const ProgramSelectionModal: React.FC<ProgramSelectionModalProps> = ({ onClose, onSelectProgram, onStartRegistration }) => {
    const [hoveredId, setHoveredId] = useState<string | null>('creser');

    return (
        <div
            className="fixed inset-0 z-[10000] flex flex-col md:flex-row bg-[#11131a] animate-fade-in w-full h-full overflow-hidden"
            data-lenis-prevent
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-50 p-3 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full transition-all duration-300"
                aria-label="Cerrar modal"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Left/Top Section: Intro & Fast Track */}
            <div className="w-full md:w-[400px] lg:w-[450px] flex-shrink-0 bg-[#0A0D14] flex flex-col justify-between p-8 md:p-12 z-10 border-r border-white/5 shadow-2xl relative">
                <div>
                    <span className="text-celeste-strong font-bold tracking-widest text-xs uppercase mb-4 block">Comenzá tu viaje</span>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6 leading-tight">¿Por dónde<br />elegís empezar?</h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Seleccioná el programa que mejor resuene con tu momento actual, o inscribite directamente a nuestro programa insignia.
                    </p>
                </div>

                <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-2">CreSER: El Programa Estrella</h3>
                    <p className="text-sm text-slate-400 mb-6">Si ya estás decidido a dar el gran salto, asegúrate tu lugar en la próxima edición.</p>
                    <button
                        onClick={onStartRegistration}
                        className="w-full py-4 px-6 bg-celeste-strong hover:bg-[#258e9d] text-white rounded-xl font-bold flex items-center justify-between transition-colors shadow-lg shadow-celeste-strong/20"
                    >
                        Quiero inscribirme ahora
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Right/Bottom Section: Expanding Accordion Cards */}
            <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
                {programs.map((program) => {
                    const isHovered = hoveredId === program.id;
                    return (
                        <div
                            key={program.id}
                            onMouseEnter={() => setHoveredId(program.id)}
                            onClick={() => onSelectProgram(program.id)}
                            className={`relative h-full flex flex-col justify-end overflow-hidden cursor-pointer transition-all duration-700 ease-out group border-l border-white/5
                            ${isHovered ? 'md:w-[60%] flex-grow' : 'md:w-[20%] opacity-70 hover:opacity-100'}
                            `}
                        >
                            {/* Background Image */}
                            <img
                                src={program.image}
                                alt={program.name}
                                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out ${isHovered ? 'scale-105' : 'scale-100'}`}
                            />
                            
                            {/* Dark Gradient Overlay for readability */}
                            <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-700 
                                ${program.isMain ? 'from-celeste-strong/80 via-black/50 to-transparent' : 'from-black/90 via-black/40 to-transparent'}
                                ${isHovered ? 'opacity-90' : 'opacity-70'}`} 
                            />

                            {/* Text Content */}
                            <div className={`relative z-10 p-8 md:p-12 transition-all duration-500 ease-in-out ${isHovered ? 'translate-y-0 opacity-100' : 'md:translate-y-8 md:opacity-0 lg:opacity-100'}`}>
                                <div className={`flex flex-col ${!isHovered && 'md:-rotate-90 md:origin-bottom-left md:absolute md:bottom-24 md:left-12 lg:rotate-0 lg:relative lg:bottom-auto lg:left-auto'} transition-all duration-500`}>
                                    <span className="text-white/60 font-bold uppercase tracking-widest text-xs mb-2 block whitespace-nowrap">
                                        {program.tagline}
                                    </span>
                                    <h3 className={`font-serif font-bold text-white mb-4 ${isHovered ? 'text-4xl md:text-5xl' : 'text-3xl'} whitespace-nowrap transition-all duration-500`}>
                                        {program.name}
                                    </h3>
                                    
                                    <div className={`overflow-hidden transition-all duration-500 ${isHovered ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <p className="text-white/80 text-lg md:text-xl font-light mb-8 max-w-xl">
                                            {program.description}
                                        </p>
                                        <button className="flex items-center gap-3 text-white font-bold tracking-widest uppercase text-sm group-hover:gap-5 transition-all">
                                            Ver detalles
                                            <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                                                <ArrowRightIcon className="w-4 h-4" />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgramSelectionModal;
