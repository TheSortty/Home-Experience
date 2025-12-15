import React, { useState, useEffect, useRef } from 'react';

const features = [
  {
    id: 1,
    title: "1. Sembrar el Ser",
    description: "En la quietud de la tierra fértil, plantamos la intención más pura. No es solo crecer, es florecer desde la esencia, rompiendo etiquetas para tocar el cielo con raíces profundas.",
    quote: "Tu verdad florece desde adentro.",
    image: "/images/etapa1.jpg"
  },
  {
    id: 2,
    title: "2. El Espejo del Nombre",
    description: "Más allá de las formas, nos encontramos en la mirada del otro. Un nombre no es solo un sonido, es el mantra que nos ancla al presente y nos abre la puerta a la pertenencia.",
    quote: "Reconocerse es el primer acto de amor.",
    image: "/images/etapa2.jpg"
  },
  {
    id: 3,
    title: "3. El Calor del Encuentro",
    description: "El ritual sagrado de compartir. Donde el tiempo se detiene y las almas conversan sin prisa, mano a mano, tejiendo la red invisible que nos sostiene a todos.",
    quote: "En cada gesto, somos uno.",
    image: "/images/etapa3.jpg"
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
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
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
          <div className="lg:w-1/2 ">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                ref={(el) => (sectionRefs.current[index] = el)}
                data-index={index}
                className={`flex flex-col justify-center transition-all duration-1000 ${
                  /* Precise Vertical Alignment Logic:
                   * The sticky container is centered (50vh).
                   * We want the first text (index 0) to START exactly at that center point when the section begins.
                   * We want the last text (index len-1) to END/STOP at that center point before scrolling away.
                   *
                   * Strategy: Use large padding to push the "centered" flex content to the extremes.
                   * A padding of roughly 40-45vh helps position the active content trigger zone.
                   */
                  index === 0 ? 'min-h-[100vh] py-[40vh] justify-center' : // First item: Content centered in a large active zone
                    index === features.length - 1 ? 'min-h-[100vh] py-[40vh] justify-center' : // Last item: Similar logic
                      'min-h-[100vh] justify-center' // Middle items: Standard center
                  } ${activeFeature === index ? 'opacity-100 blur-0' : 'opacity-30 blur-sm'}`}
              >
                <span className="text-sm font-mono font-bold tracking-widest text-google-grey-800 mb-4 lg:mb-6 uppercase">
                  ETAPA 0{feature.id}
                </span>
                <h3 className="text-4xl lg:text-5xl xl:text-6xl font-sans font-medium text-google-grey-900 mb-6 lg:mb-8 tracking-tight leading-tight">
                  {feature.title.split('. ')[1]}
                </h3>

                {/* Mobile Image (Visible only on small screens) */}
                <div className="lg:hidden mb-8 w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-lg relative">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <p className="text-lg lg:text-xl xl:text-2xl text-google-grey-800 leading-relaxed max-w-lg font-light">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Right Column: Sticky Image (Desktop Only) */}
          <div className="lg:w-1/2 relative hidden lg:block">
            {/* Sticky container completely centered and limited height to avoid touching header/bottom */}
            <div className="sticky top-36 h-[calc(100vh-13rem)] flex items-center justify-center">
              <div className="relative w-full max-w-[550px] aspect-[3/4] max-h-full rounded-[24px] shadow-2xl overflow-hidden bg-white">
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