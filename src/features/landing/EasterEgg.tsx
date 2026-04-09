import React from 'react';
import Image from 'next/image';

interface EasterEggProps {
  isVisible: boolean;
  onClose: () => void;
}

const EasterEgg: React.FC<EasterEggProps> = ({ isVisible, onClose }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar easter egg"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="font-serif text-3xl font-bold text-[var(--color-dark)] mb-4">
          Recordar es volver a pasar por el corazón.
        </h2>
        <p className="text-slate-600 mb-6">
          Nos alegra verte de nuevo por aquí. Sabemos que el camino no termina, solo se transforma. Esperamos que estos recuerdos te dibujen una sonrisa.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(num => (
                <div key={num} className="relative aspect-square">
                    <Image src={`https://picsum.photos/400/400?random=${num}`} alt={`Nostalgic moment ${num}`} fill sizes="(max-width: 768px) 50vw, 33vw" unoptimized className="object-cover rounded-lg shadow-md" />
                </div>
            ))}
        </div>
        <p className="mt-6 text-sm text-slate-500 italic">
          "Lo que la oruga llama el fin del mundo, el maestro lo llama mariposa."
        </p>
      </div>
       <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default EasterEgg;