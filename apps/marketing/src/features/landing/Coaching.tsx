import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import SparkleIcon from '../../ui/icons/SparkleIcon';

const logos = [
    { name: 'SOLITECH', url: 'https://via.placeholder.com/150?text=SOLITECH' },
    { name: 'MI GUSTO', url: 'https://via.placeholder.com/150?text=MI+GUSTO' },
    { name: 'UNDER CLUB', url: 'https://via.placeholder.com/150?text=UNDER+CLUB' },
    { name: 'HIT COWORK', url: 'https://via.placeholder.com/150?text=HIT+COWORK' },
    { name: 'RABADON CAPITAL', url: 'https://via.placeholder.com/150?text=RABADON+CAPITAL' },
];

const Coaching: React.FC = React.memo(() => {
    return (
        <section id="coaching" className="py-24 bg-transparent overflow-hidden scroll-mt-24">
            <div className="container mx-auto px-6">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <h2 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 mb-6">COACHING</h2>
                    <p className="max-w-3xl mx-auto text-xl text-slate-600 leading-relaxed">
                        "El coaching es una invitación a hacerse responsable de la propia forma de estar en el mundo y a entrenar la capacidad de ver nuevas posibilidades y crear un futuro distinto alineado al propósito más profundo del SER, tanto a nivel personal como organizacional."
                    </p>
                </div>

                {/* 1. Coaching Individual */}
                <div className="mb-32 grid md:grid-cols-2 gap-16 items-center">
                    <div className="order-2 md:order-1">
                        <h3 className="text-4xl font-serif font-bold text-slate-900 mb-6">Coaching Individual</h3>
                        <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                            El coaching personal es un proceso de aprendizaje que acompaña a las personas a ampliar su mirada, clarificar objetivos y diseñar acciones alineadas con lo que desean crear en su vida personal y profesional, generando nuevos resultados.
                        </p>
                        <p className="text-sm text-slate-500 mb-8 uppercase tracking-widest">
                            La frecuencia de las sesiones y la duración del proceso se definen de común acuerdo.
                        </p>

                        <div className="bg-celeste-strong/5 border border-celeste-strong/20 p-8 rounded-2xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <h4 className="font-bold text-slate-900 mb-4">Agendá tu primer sesión</h4>
                                <p className="text-slate-600 text-sm mb-6">
                                    Un espacio gratuito para conocernos, escuchar tus objetivos y ver si el proceso es adecuado para vos. Elegí un coach para contactar:
                                </p>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { name: 'Maga', phone: '5491134786937' },
                                        { name: 'Mariano', phone: '5491151589383' },
                                        { name: 'Maru', phone: '5491153338335' },
                                        { name: 'Vivi', phone: '5491130586930' }
                                    ].map((coach) => (
                                        <a 
                                            key={coach.name}
                                            href={`https://wa.me/${coach.phone}?text=${encodeURIComponent(`¡Hola ${coach.name}! Vi el anuncio en la página de siendohome y quisiera agendar una sesión de coaching individual.`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-col items-center p-4 bg-white/60 hover:bg-celeste-strong hover:text-white rounded-xl border border-celeste-strong/20 transition-all duration-300 shadow-sm group/coach"
                                        >
                                            <span className="font-bold text-sm mb-1">{coach.name}</span>
                                            <span className="text-[10px] opacity-70 group-hover/coach:opacity-100 uppercase tracking-tighter">Contactar</span>
                                        </a>
                                    ))}
                                </div>

                                <div className="flex items-center gap-4 text-celeste-strong font-medium mt-8 pt-6 border-t border-celeste-strong/10">
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-celeste-strong animate-pulse"></span>
                                        Online
                                    </span>
                                    <span>•</span>
                                    <span>30 minutos</span>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-celeste-strong/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-celeste-strong/20 transition-colors"></div>
                        </div>
                    </div>
                    <div className="order-1 md:order-2 relative aspect-square rounded-3xl overflow-hidden shadow-2xl">
                        <Image src="/images/coaching/individual.jpg" alt="Coaching Individual" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                    </div>
                </div>

                {/* 2. Coaching Organizacional */}
                <div className="mb-32">
                    <div className="grid md:grid-cols-2 gap-16 items-center mb-16">
                        <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl">
                            <Image src="/images/coaching/organizacional.jpg" alt="Coaching Organizacional" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                        </div>
                        <div>
                            <h3 className="text-4xl font-serif font-bold text-slate-900 mb-6">Coaching Organizacional</h3>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                Coaching organizacional, ejecutivo y empresarial para empresas que desean desarrollar líderes conscientes, equipos alineados y resultados sostenibles, en entornos colaborativos y de bienestar. Optimizando procesos de productividad y sostenibilidad económica.
                            </p>

                            <a
                                href="https://wa.me/5491134786937"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block"
                            >
                                <button className="px-8 py-4 bg-slate-900 text-white rounded-full font-medium hover:bg-celeste-strong transition-colors flex items-center gap-3 group">
                                    Agendá una llamada de diagnóstico
                                    <span className="text-xs opacity-70">30 min • Online</span>
                                </button>
                            </a>
                        </div>
                    </div>

                </div>

                {/* 3. Certificación with Glassmorphism Effect */}
                <div className="relative">
                    {/* Background decorative blobs for glass effect visibility */}
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-celeste-strong/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

                    <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] p-12 md:p-20 text-slate-900 border border-white/40 shadow-2xl relative overflow-hidden">
                        <SparkleIcon className="absolute top-10 right-10 h-20 w-20 text-slate-900/5" />
                        <div className="max-w-6xl relative z-10">
                            <div className="flex flex-col lg:flex-row gap-12 items-center">
                                <div className="lg:w-2/3">
                                    <h3 className="text-3xl md:text-5xl font-serif font-bold mb-8">Certificación en Coaching</h3>
                                    <div className="space-y-6">
                                        <p className="text-lg text-slate-700 leading-relaxed">
                                            Nuestra certificación está orientada a formar coaches con base teórica sólida, práctica experiencial y profundo trabajo personal.
                                        </p>
                                        <p className="text-lg text-slate-700 leading-relaxed">
                                            Integra herramientas de coaching ontológico, aprendizaje experiencial y prácticas reflexivas, preparando a las personas tanto para el ejercicio profesional como para aplicar el coaching en su vida y en organizaciones.
                                        </p>
                                        <div className="grid md:grid-cols-2 gap-6 pt-4">
                                            <div className="p-6 bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm flex flex-col justify-between hover:bg-white/80 transition-colors">
                                                <p className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-bold">Avalado por</p>
                                                <Image 
                                                    src="/Logo-Camara-Argentina.png" 
                                                    alt="Cámara Argentina para la Formación Profesional y la Capacitación Laboral" 
                                                    width={300}
                                                    height={100}
                                                    className="w-full h-auto object-contain max-h-24 mix-blend-multiply opacity-90 transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </div>
                                            <div className="p-6 bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm flex flex-col justify-between hover:bg-white/80 transition-colors">
                                                <p className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-bold">Aval Internacional</p>
                                                <Image 
                                                    src="/OIEP.png" 
                                                    alt="OIEP (Organización Internacional para la Educación Permanente)" 
                                                    width={300}
                                                    height={100}
                                                    className="w-full h-auto object-contain max-h-24 mix-blend-multiply opacity-90 transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:w-1/3 flex justify-center">
                                    <div className="relative group">
                                        <div className="absolute -inset-4 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all"></div>
                                        <Image
                                            src="/logo-circle.png"
                                            alt="HOME Logo"
                                            width={256}
                                            height={256}
                                            className="relative w-48 h-48 md:w-64 md:h-64 transition-transform group-hover:scale-105"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
});

export default Coaching;
