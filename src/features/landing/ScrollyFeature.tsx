import React, { useState, useEffect, useRef } from 'react';

const features = [
  {
    id: 1,
    title: "1. El Espejo",
    description: "El primer paso es detenerse. Un espacio para la introspección, para mirarte sin juicios y reconocer tu punto de partida con honestidad radical.",
    quote: "No puedes cambiar lo que no estás dispuesto a ver.",
    image: "https://images.unsplash.com/photo-1518640027989-a30d5d7e498e?q=80&w=2070&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "2. La Grieta",
    description: "Confrontamos las estructuras que te limitan. Con valentía, cuestionamos tus creencias para abrir espacio a lo nuevo. La vulnerabilidad es tu fortaleza.",
    quote: "Por la herida es por donde entra la luz.",
    image: "https://images.unsplash.com/photo-1485796826113-174aa68fd81b?q=80&w=2074&auto=format&fit=crop"
  },
  {
    id: 3,
    title: "3. El Vacío",
    description: "Antes de llenar, hay que soltar. Aprendemos a habitar la incertidumbre y el silencio, lugares fértiles donde nacen las verdaderas decisiones.",
    quote: "El silencio no está vacío, está lleno de respuestas.",
    image: "https://images.unsplash.com/photo-1507692049790-de58293a469d?q=80&w=2069&auto=format&fit=crop"
  },
  {
    id: 4,
    title: "4. La Raíz",
    description: "Reconectamos con tu esencia y tus valores no negociables. Construimos una base sólida que no dependa de la validación externa.",
    quote: "Para crecer hacia arriba, primero hay que crecer hacia adentro.",
    image: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2074&auto=format&fit=crop"
  },
  {
    id: 5,
    title: "5. El Renacer",
    description: "Desde la aceptación, integramos todas tus partes. Diseñamos una nueva narrativa personal alineada con quien realmente eres hoy.",
    quote: "El final de una etapa es siempre el comienzo de otra.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=2031&auto=format&fit=crop"
  },
  {
    id: 6,
    title: "6. La Expansión",
    description: "Llevamos lo aprendido a la acción. No estás solo; caminas acompañado por una comunidad que sostiene y potencia tu vuelo.",
    quote: "Caminamos juntos para llegar más lejos.",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2064&auto=format&fit=crop"
  }
];

const ScrollyFeature: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setActiveFeature(index);
          }
        });
      },
      {
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0.1
      }
    );

    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="methodology" className="py-16 lg:py-24">
      <div className="container mx-auto px-6 max-w-[1728px]">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">

          {/* Left Column: Scrolling Text */}
          <div className="lg:w-1/2 pb-10">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                ref={(el) => (sectionRefs.current[index] = el)}
                data-index={index}
                className={`min-h-[50vh] lg:min-h-[60vh] flex flex-col justify-center transition-all duration-700 ${activeFeature === index ? 'opacity-100 blur-0' : 'opacity-40 lg:opacity-20 blur-0 lg:blur-sm'}`}
              >
                <span className="text-sm font-mono font-bold tracking-widest text-google-grey-800 mb-4 lg:mb-6 uppercase">
                  ETAPA 0{feature.id}
                </span>
                <h3 className="text-4xl lg:text-5xl xl:text-7xl font-sans font-medium text-google-grey-900 mb-6 lg:mb-8 tracking-tight leading-tight">
                  {feature.title.split('. ')[1]}
                </h3>

                {/* Mobile Image (Visible only on small screens) */}
                <div className="lg:hidden mb-8 w-full aspect-video rounded-2xl overflow-hidden shadow-lg relative">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20"></div>
                </div>

                <p className="text-lg lg:text-xl xl:text-2xl text-google-grey-800 leading-relaxed max-w-lg font-light">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Right Column: Sticky Image (Desktop Only) */}
          <div className="lg:w-1/2 relative hidden lg:block">
            <div className="sticky top-0 h-screen flex items-center justify-center py-12">
              <div className="relative w-full max-w-xl aspect-[3/4] rounded-[24px] shadow-2xl overflow-hidden bg-google-grey-50">

                {features.map((feature, index) => (
                  <div
                    key={feature.id}
                    className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${activeFeature === index
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-110'
                      }`}
                  >
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                    {/* Quote on Image */}
                    <div className="absolute bottom-12 left-8 right-8 text-white">
                      <p className="text-lg font-sans italic text-center opacity-90 leading-relaxed">
                        "{feature.quote}"
                      </p>
                    </div>
                  </div>
                ))}

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
                  <div
                    className="h-full bg-white transition-all duration-500 ease-out"
                    style={{ width: `${((activeFeature + 1) / features.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ScrollyFeature;