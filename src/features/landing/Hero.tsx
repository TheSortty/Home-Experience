'use client';

import React from 'react';
import ArrowRightIcon from '../../ui/icons/ArrowRightIcon';

interface HeroProps {
  onRegisterClick?: () => void;
}

const Hero: React.FC<HeroProps> = React.memo(({ onRegisterClick }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-white">

      <div className="container mx-auto px-6 relative z-10 text-center w-full flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-tight text-slate-900 mb-6">
          EXPERIENCIA <br />
          <span className="text-celeste-strong font-sans">HOME</span>
        </h1>

        <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-in-up font-light" style={{ animationDelay: '0.2s' }}>
          Procesos de transformación que marcan un antes y un después en tu vida.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={onRegisterClick}
            className="group relative px-8 py-4 bg-slate-900 text-white rounded-full font-medium overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-900/20"
          >
            <span className="relative z-10 flex items-center">
              Comenzar Viaje
              <ArrowRightIcon className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
            <div className="absolute inset-0 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
          </button>


          <div className="flex flex-col items-center mt-12 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <span className="text-sm text-slate-400 mb-4">Ver Video</span>
            <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center p-1 animate-bounce">
              <div className="w-1 h-2 bg-slate-400 rounded-full animate-scroll"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default Hero;