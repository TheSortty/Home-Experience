'use client';

import React from 'react';
import Image from 'next/image';
import SparkleIcon from '../../ui/icons/SparkleIcon';

const programs = [
    {
        id: 'creser',
        name: 'Programa CreSER',
        tagline: 'Entrenamiento de la actitud, 100% experiencial y de alto impacto emocional.',
        phrase: '“Para el 95% de las personas, fue una de las experiencias más significativas de su vida.”',
        purpose: 'Desarrollar responsabilidad personal, autoconocimiento y una nueva forma de relacionarse con los desafíos de la vida obteniendo resultados extraordinarios.',
        target: 'A personas que sienten que quieren un cambio tangible con resultados sólidos, que están dispuestas a mirarse, desafiarse y asumir un rol activo en la creación de su vida.',
        extra: '(*) Mayores de 18 años',
        image: '/images/programs/creser.jpg', // Was Vincularte
        color: '#00A3E0', // Celeste
    },
    {
        id: 'vincularte',
        name: 'Programa Vincularte',
        tagline: 'Programa orientado a explorar y transformar la forma en que nos relacionamos con otros.',
        purpose: 'Tomar conciencia de patrones vinculares, habilitar conversaciones pendientes y construir vínculos más sanos, auténticos y responsables.',
        target: 'A personas que desean mejorar la calidad de sus relaciones personales, familiares, laborales o afectivas.',
        duration: '2 meses y medio',
        modality: 'Presencial u Online',
        image: '/images/programs/vincularte.jpg', // Was CreSER
        color: '#003358', // Dark Blue
    },
    {
        id: 'evolucion',
        name: 'Programa Evolución',
        tagline: 'Proceso de transformación personal que combina encuentros reflexivos y herramientas de coaching ontológico.',
        purpose: 'Acompañar a las personas a revisar su manera de pensar, sentir y actuar, generando mayor coherencia entre lo que desean y lo que hacen.',
        target: 'A personas que buscan un proceso de crecimiento consciente, sostenido en el tiempo y aplicable a su vida cotidiana.',
        duration: '2 meses - 8 encuentros semanales',
        modality: 'Online o Presencial',
        image: '/images/programs/evolucion.jpg', // Was Coaching Org
        color: '#005596', // Blue
    }
];

interface ProgramsProps {
    onLearnMore: (id: string) => void;
}

const Programs: React.FC<ProgramsProps> = React.memo(({ onLearnMore }) => {
    return (
        <section id="programs" className="py-24 bg-transparent scroll-mt-24">
            <div className="container mx-auto px-6">
                {/* Header */}
                <div className="max-w-4xl mx-auto text-center mb-20">
                    <h2 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 mb-8 uppercase">PROGRAMAS</h2>
                    <div className="space-y-6 text-xl text-slate-600 leading-relaxed">
                        <p>
                            Nuestros programas se caracterizan por tener un tiempo determinado, con un proceso claro de inicio, desarrollo y cierre.
                        </p>
                        <div className="grid md:grid-cols-3 gap-8 pt-8">
                            {[
                                'Distintos abordajes de aprendizaje (vivencial, reflexivo, corporal, emocional)',
                                'Propósitos específicos',
                                'Diferentes duraciones y niveles de intensidad'
                            ].map((item, i) => (
                                <div key={i} className="text-sm font-medium p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-center">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Programs Grid */}
                <div className="grid lg:grid-cols-3 gap-12">
                    {programs.map((program) => (
                        <div key={program.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 flex flex-col h-full group hover:-translate-y-2 transition-transform duration-500">
                            <div className="h-64 relative overflow-hidden">
                                <Image src={program.image} alt={program.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute bottom-6 left-8 right-8">
                                    <h3 className="text-2xl font-bold text-white mb-1">{program.name}</h3>
                                    {program.modality && <span className="text-xs uppercase bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white font-bold">{program.modality}</span>}
                                </div>
                            </div>

                            <div className="p-8 md:p-10 flex flex-col flex-grow">
                                <p className="text-slate-900 font-bold mb-6 text-lg">
                                    {program.tagline}
                                </p>

                                {program.phrase && (
                                    <blockquote className="border-l-4 border-celeste-strong pl-6 py-2 mb-8 italic text-slate-600">
                                        {program.phrase}
                                    </blockquote>
                                )}

                                <div className="space-y-6 mb-10 flex-grow">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Propósito</h4>
                                        <p className="text-slate-600 leading-relaxed">{program.purpose}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">¿A quién está dirigido?</h4>
                                        <p className="text-slate-600 leading-relaxed">{program.target}</p>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-100 mt-auto flex flex-wrap gap-4 items-center justify-between">
                                    {program.duration && (
                                        <div className="text-sm font-bold text-slate-900">
                                            Duración: <span className="font-medium text-slate-600">{program.duration}</span>
                                        </div>
                                    )}
                                    {program.extra && (
                                        <span className="text-xs text-slate-400 italic">{program.extra}</span>
                                    )}
                                    <button
                                        onClick={() => onLearnMore(program.id)}
                                        className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-celeste-strong transition-colors"
                                    >
                                        Saber más
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 text-center">
                    <p className="text-slate-500 italic max-w-2xl mx-auto">
                        "Son experiencias diseñadas para que el aprendizaje no sea solo conceptual, sino profundamente transformador."
                    </p>
                </div>
            </div>
        </section>
    );
});

export default Programs;
