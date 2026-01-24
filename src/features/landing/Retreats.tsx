import React from 'react';

const Retreats: React.FC = () => {
    return (
        <section id="retreats" className="py-32 bg-slate-50 text-slate-900 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                <img src="/images/retreats/patagonia.jpg" alt="" className="w-full h-full object-cover grayscale" />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mb-24">
                    <h2 className="text-5xl md:text-7xl font-serif font-bold mb-8 uppercase text-slate-900">VIAJES & RETIROS</h2>
                    <p className="text-xl md:text-2xl text-slate-600 leading-relaxed font-light">
                        En un contexto de vida acelerada, atravesada por la tecnología y la inmediatez, diseñamos retiros pensados para pausar, salir del automatismo cotidiano y volver a sentir.
                    </p>
                    <p className="text-xl md:text-2xl text-slate-600 leading-relaxed font-light mt-6">
                        Son experiencias inmersivas donde el entorno natural acompaña y potencia procesos de introspección, conexión y transformación profunda.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
                    {/* Retiro 2025 */}
                    <div className="group">
                        <div className="aspect-[16/10] rounded-[2rem] overflow-hidden mb-8 shadow-2xl relative">
                            <img src="/images/retreats/patagonia.jpg" alt="Retiro San Martín de los Andes" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute top-6 left-6 bg-celeste-strong text-white text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest">
                                Próximo retiro
                            </div>
                        </div>
                        <h3 className="text-3xl font-serif font-bold mb-4">Retiros 2025</h3>
                        <p className="text-celeste-strong text-lg font-bold mb-4">San Martín de los Andes</p>
                        <p className="text-slate-500 leading-relaxed max-w-md">
                            Una inmersión profunda en la Patagonia para reconectar con el propósito a través de la naturaleza y el silencio.
                        </p>
                    </div>

                    {/* Retiro 2024 */}
                    <div className="group lg:mt-24">
                        <div className="aspect-[16/10] rounded-[2rem] overflow-hidden mb-8 shadow-2xl relative">
                            <img src="/images/retreats/uruguay.jpg" alt="Retiro Uruguay" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" />
                            <div className="absolute top-6 left-6 bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest">
                                Finalizado
                            </div>
                        </div>
                        <h3 className="text-3xl font-serif font-bold mb-4">Retiro 2024</h3>
                        <p className="text-slate-500 text-lg font-medium mb-4">Uruguay</p>
                        <p className="text-slate-400 leading-relaxed max-w-md">
                            Nuestra última experiencia frente al mar, integrando procesos de transformación en la calma de la costa uruguaya.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Retreats;
