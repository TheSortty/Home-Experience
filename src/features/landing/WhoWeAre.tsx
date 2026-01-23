import React from 'react';
import SparkleIcon from '../../ui/icons/SparkleIcon';

interface WhoWeAreProps {
  onConfioClick: () => void;
}

const WhoWeAre: React.FC<WhoWeAreProps> = ({ onConfioClick }) => {
  return (
    <section
      id="who-we-are"
      className="py-24 md:py-40 text-slate-900"
    >
      <div className="container mx-auto px-6 text-center">
        <div className="relative inline-block mb-12">
          <SparkleIcon className="absolute -top-8 -left-12 h-10 w-10 text-slate-200 transform -rotate-12 hidden md:block" />
          <h2 className="font-serif text-5xl md:text-7xl font-bold uppercase tracking-tight">
            QUIÉNES SOMOS
          </h2>
          <SparkleIcon className="absolute -bottom-4 -right-12 h-10 w-10 text-slate-200 transform rotate-12 hidden md:block" />
        </div>
        <div className="max-w-4xl mx-auto space-y-8 text-xl lg:text-3xl text-slate-600 leading-relaxed text-left font-light">
          <p>
            Somos un equipo de <span className="font-bold text-slate-900">coaches profesionales apasionados por la transformación humana</span>, que acompañamos a personas y equipos a través de programas y procesos de aprendizaje experienciales.
          </p>
          <p>
            Hace más de <span className="font-bold text-slate-900">12 años</span> facilitamos espacios de desarrollo personal y liderazgo orientados a generar resultados tangibles y sostenibles.
          </p>
          <p>
            En HOME diseñamos experiencias que integran <span className="italic">reflexión, vivencia y acción</span>, con el propósito de que cada proceso tenga sentido, profundidad y un impacto concreto en la vida personal y profesional de quienes participan.
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhoWeAre;