import React from 'react';
import { Testimonial } from '../core/types';
import StarIcon from './icons/StarIcon';
import PhotoIcon from './icons/PhotoIcon';

interface TestimonialModalProps {
  testimonial: Testimonial | null;
  onClose: () => void;
}

const TestimonialModal: React.FC<TestimonialModalProps> = ({ testimonial, onClose }) => {
  if (!testimonial) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl p-8 md:p-12 max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors z-10 p-2 hover:bg-slate-100 rounded-full"
          aria-label="Cerrar modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon key={i} className={`h-6 w-6 ${i < testimonial.rating ? 'text-yellow-400' : 'text-slate-200'}`} />
          ))}
        </div>

        <blockquote className="text-2xl md:text-3xl text-slate-900 font-serif leading-relaxed mb-10">
          "{testimonial.quote}"
        </blockquote>

        <div className="flex items-center gap-4 border-t border-slate-100 pt-8 mb-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400">
            {testimonial.author.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{testimonial.author}</p>
            <p className="text-sm text-slate-500 uppercase tracking-wide">{`${testimonial.roles.join(' • ')}`}</p>
            <p className="text-xs text-slate-400 mt-1">{`Ciclo ${testimonial.cycle} • PL ${testimonial.pl}`}</p>
          </div>
        </div>

        {/* Placeholder for future multimedia */}
        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 border-dashed">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <PhotoIcon className="w-5 h-5 text-slate-400" />
            Recuerdos del viaje
          </h3>
          <div className="aspect-video bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
            <p className="text-slate-400 text-sm">Imágenes y videos próximamente.</p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default TestimonialModal;