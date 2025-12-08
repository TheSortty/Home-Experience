import React from 'react';
import JourneyPathIcon from '../../ui/icons/JourneyPathIcon';
import SparkleIcon from '../../ui/icons/SparkleIcon';

const features = [
  {
    title: 'Entrenamiento Experiencial',
    description: 'Entrenamiento de actitud 100% experiencial y de alto impacto emocional. No es teoría, es vivencia pura diseñada para marcar un antes y un después.',
    videoUrl: 'https://res.cloudinary.com/dgduc73hq/video/upload/v1762979185/9038530-uhd_2160_4096_25fps_oihkyz.mp4',
    altText: 'Dinámica grupal de alto impacto.',
  },
  {
    title: 'Potencia tu Actitud',
    description: 'Potencia tu forma de manejar circunstancias y desafíos cotidianos. Aprender a ser libre es cambiar la relación que tienes con tu palabra.',
    videoUrl: 'https://res.cloudinary.com/dgduc73hq/video/upload/v1762978960/6719636-uhd_2160_3840_25fps_wigfgj.mp4',
    altText: 'Persona superando un desafío.',
  },
  {
    title: 'Equipo Profesional',
    description: 'Coaches profesionales con más de 10 años de experiencia acompañando procesos de transformación personal y liderazgo.',
    videoUrl: 'https://res.cloudinary.com/dgduc73hq/video/upload/v1762978209/6275800-uhd_2160_4096_25fps_ynspp6.mp4',
    altText: 'Equipo de coaches trabajando.',
  }
];

const FeatureVideo: React.FC<{ src: string; altText: string }> = ({ src, altText }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(e => console.log("Autoplay prevented:", e));
            } else {
              videoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.3 } // Play when 30% is visible
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      loop
      muted
      playsInline
      className="w-full h-full object-cover"
      aria-label={altText}
    >
      Your browser does not support the video tag.
    </video>
  );
};

const WhatWeDo: React.FC = () => {
  return (
    <section
      id="about"
      className="py-24 md:py-40"
    >
      <div className="container mx-auto px-6">
        <div className="text-center mb-24">
          <JourneyPathIcon className="mx-auto h-24 w-24 text-[var(--color-light)] mb-8" />
          <h2 className="font-serif text-5xl md:text-7xl font-bold mb-6 text-white">
            ¿Qué es CRESER?
          </h2>
          <p className="max-w-4xl mx-auto text-xl lg:text-2xl text-slate-200 leading-relaxed">
            Una propuesta única para desafiar tus límites y redescubrir tu potencial.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Vertical Timeline */}
          <div className="absolute left-4 md:left-1/2 w-0.5 h-full bg-[var(--color-light)]/20 -translate-x-1/2"></div>

          <div className="space-y-24">
            {features.map((feature, index) => (
              <div key={index} className="relative">
                {/* Timeline Dot */}
                <div className="absolute top-0 left-4 md:left-1/2 w-4 h-4 bg-[var(--color-lightest)] rounded-full -translate-x-1/2 border-4 border-[var(--color-darkest)]"></div>

                <div className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                  {/* Video */}
                  <div className="md:w-1/2 pl-12 md:pl-0 flex justify-center" data-interactive="true">
                    <div className="w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl shadow-black/30 bg-gray-900">
                      <FeatureVideo src={feature.videoUrl} altText={feature.altText} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`md:w-1/2 pl-12 md:pl-0 relative ${index % 2 !== 0 ? 'md:pr-16' : ''}`}>
                    <SparkleIcon className="absolute -top-8 -left-4 h-8 w-8 text-[var(--color-light)]/50 transform rotate-12" />
                    <SparkleIcon className="absolute -bottom-8 -right-4 h-12 w-12 text-[var(--color-light)]/30 transform -rotate-12" />
                    <h3 className="font-serif text-4xl md:text-5xl font-semibold text-[var(--color-lightest)] mb-4">{feature.title}</h3>
                    <p className="text-xl text-slate-200 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatWeDo;