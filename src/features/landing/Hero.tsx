'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import ArrowRightIcon from '../../ui/icons/ArrowRightIcon';

gsap.registerPlugin(useGSAP);

interface HeroProps {
  onRegisterClick?: () => void;
}

const Hero: React.FC<HeroProps> = React.memo(({ onRegisterClick }) => {
  const sectionRef  = useRef<HTMLElement>(null);
  const headingRef  = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const actionsRef  = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      /* Reduced motion — everything already visible, nothing to do */
      mm.add('(prefers-reduced-motion: reduce)', () => { /* noop */ });

      /* Full entrance timeline */
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ delay: 0.12 });

        tl.from(headingRef.current, {
          opacity: 0,
          y: 48,
          duration: 0.9,
          ease: 'power3.out',
        })
          .from(
            subtitleRef.current,
            { opacity: 0, y: 26, duration: 0.72, ease: 'power2.out' },
            '-=0.55',
          )
          .from(
            actionsRef.current,
            { opacity: 0, y: 18, duration: 0.6, ease: 'power2.out' },
            '-=0.42',
          )
          .from(
            scrollRef.current,
            { opacity: 0, duration: 0.5, ease: 'power1.out' },
            '-=0.2',
          );

        return () => tl.kill();
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-white"
    >
      <div className="container mx-auto px-6 relative z-10 text-center w-full flex flex-col items-center">

        <h1
          ref={headingRef}
          className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-tight text-slate-900 mb-6"
        >
          EXPERIENCIA <br />
          <span className="text-celeste-strong font-sans">HOME</span>
        </h1>

        <p
          ref={subtitleRef}
          className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed font-light"
        >
          Procesos de transformación que marcan un antes y un después en tu vida.
        </p>

        <div
          ref={actionsRef}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={onRegisterClick}
            className="group relative px-8 py-4 bg-slate-900 text-white rounded-full font-medium overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-900/20"
          >
            <span className="relative z-10 flex items-center">
              Comenzar Viaje
              <ArrowRightIcon className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
            <div className="absolute inset-0 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
          </button>
        </div>

        {/* Scroll indicator */}
        <div ref={scrollRef} className="flex flex-col items-center mt-12">
          <span className="text-sm text-slate-400 mb-4">Ver Video</span>
          <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center p-1 animate-bounce">
            <div className="w-1 h-2 bg-slate-400 rounded-full animate-scroll" />
          </div>
        </div>

      </div>
    </section>
  );
});

Hero.displayName = 'Hero';
export default Hero;
