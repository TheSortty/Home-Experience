import React from 'react';
import { motion } from 'framer-motion';

const Impact: React.FC = () => {
    return (
        <section id="impact" className="py-24 bg-transparent">
            <div className="container mx-auto px-6">
                <div className="text-center mb-24">
                    <h2 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 mb-6 underline decoration-celeste-strong decoration-4 underline-offset-8">IMPACTO</h2>
                    <p className="text-lg text-slate-500 uppercase tracking-[0.2em] font-bold">Nuestro compromiso con el mundo</p>
                </div>

                {/* Social Impact */}
                <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
                    <div>
                        <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full mb-6 uppercase tracking-widest">
                            Compromiso Social
                        </div>
                        <h3 className="text-4xl font-serif font-bold text-slate-900 mb-8">Transformando comunidades</h3>
                        <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                            <p>
                                Colaboramos activamente en mejoras y ampliaciones edilicias en espacios que ya existen y que trabajan en la educación, nutrición y contención de niños y adolescentes.
                            </p>
                            <p>
                                No se trata solo de aportar recursos, sino de involucrarnos directamente: vamos a los lugares, trabajamos junto a las comunidades y participamos en las modificaciones necesarias para que esos espacios puedan crecer, sostenerse y cumplir mejor su propósito.
                            </p>
                        </div>

                        <a
                            href="https://www.youtube.com/watch?v=7pCDW6uib6U"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-10 inline-flex items-center gap-4 text-slate-900 font-bold hover:text-celeste-strong transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full border-2 border-slate-900 flex items-center justify-center group-hover:border-celeste-strong group-hover:bg-celeste-strong group-hover:text-white transition-all">
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                            Ver experiencia en YouTube
                        </a>
                    </div>

                    <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl">
                        <img src="/images/impact/social.jpg" alt="Impacto Social" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors"></div>
                    </div>
                </div>

                {/* Ecological Impact */}
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="order-2 lg:order-1 relative aspect-video rounded-3xl overflow-hidden shadow-2xl">
                        {/* Placeholder for drone video mentioned by client */}
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
                            <img src="/images/impact/ecological.jpg" alt="Limpieza de ríos" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                    <svg className="w-10 h-10 text-white fill-current" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                        <div className="inline-block px-4 py-1.5 bg-green-50 text-green-600 text-xs font-bold rounded-full mb-6 uppercase tracking-widest">
                            Compromiso Ecológico
                        </div>
                        <h3 className="text-4xl font-serif font-bold text-slate-900 mb-8">Cuidando el entorno</h3>
                        <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                            <p>
                                Trabajamos junto a <a href="https://www.instagram.com/aguaplasticocero/" target="_blank" rel="noopener noreferrer" className="text-slate-900 font-bold hover:text-celeste-strong transition-colors">@aguaplasticocero</a> en acciones de limpieza de ríos y concientización sobre el reciclaje, el cuidado del agua y el impacto del plástico en el ambiente.
                            </p>
                            <p className="italic text-slate-500">
                                "Porque transformar personas también implica cuidar el entorno que habitamos."
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Impact;
