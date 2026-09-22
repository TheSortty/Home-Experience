import React from 'react';

const ICONS = [
  '🌱', '🧘', '✨', '🧠', '❤️', '🔥', '🌑', '🌕', '⚡', '🌊', '👁️', '🕊️', '🌱', '🧘', '✨', '🧠', '❤️', '🔥', '🌑', '🌕', '⚡', '🌊', '👁️', '🕊️'
];

const IconWave: React.FC = () => {
  return (
    <section className="py-24 overflow-hidden relative">
      <div className="container mx-auto px-6 mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 max-w-3xl mx-auto leading-tight">
          "Lo que la oruga llama el fin del mundo, el maestro lo llama mariposa."
        </h2>
      </div>

      {/* Wave Container */}
      <div className="relative w-full overflow-hidden">
        <div className="flex animate-scroll-left space-x-12 whitespace-nowrap py-10 opacity-60">
          {/* Doubled for seamless loop */}
          {[...ICONS, ...ICONS].map((icon, index) => (
            <div
              key={index}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 border border-slate-200 shadow-sm text-2xl select-none"
              style={{
                marginTop: `${Math.sin(index * 0.5) * 30}px`
              }}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes scroll-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-scroll-left {
            animation: scroll-left 60s linear infinite;
        }
      `}</style>
    </section>
  );
};

export default IconWave;