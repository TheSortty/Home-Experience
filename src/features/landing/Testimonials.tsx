import React, { useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../services/supabaseClient';
import { Testimonial } from '../../core/types';
import StarIcon from '../../ui/icons/StarIcon';
import TestimonialFormModal from './TestimonialFormModal';
import { FcGoogle } from 'react-icons/fc';

interface TestimonialsProps {
  onTestimonialClick: (testimonial: Testimonial) => void;
  onAddTestimonialClick?: () => void;
  onViewAllClick: () => void;
}

const Testimonials: React.FC<TestimonialsProps> = ({ onTestimonialClick, onViewAllClick }) => {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from('testimonials')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(3);

      if (data && data.length > 0) {
        const mappedData = data.map((t: any) => ({
          id: t.id,
          author: t.author_name,
          quote: t.quote,
          roles: t.roles || [],
          cycle: t.cycle_text,
          status: t.status,
          rating: t.rating || 5,
          photoUrl: t.photo_url,
          createdAt: t.created_at
        }));
        setTestimonials(mappedData);
      }
    };
    fetchTestimonials();
  }, []);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5 mb-3">
        {[0, 1, 2, 3, 4].map((index) => {
          const filled = rating > index;
          const half = rating > index && rating < index + 1;
          return (
            <StarIcon
              key={index}
              className={`w-4 h-4 ${filled || half ? 'text-[#fbbc04]' : 'text-slate-200'}`}
              fill={half ? 'half' : (filled ? 'full' : 'none')}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section id="voices" className="py-24 relative bg-transparent scroll-mt-24">
      <div className="container mx-auto px-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-xl">
            <span className="text-blue-600 font-bold tracking-widest uppercase text-sm mb-3 block">Comunidad HOME</span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-6 leading-tight">
              Voces que <br />
              <span className="italic text-slate-500">inspiran cambios</span>
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Historias reales de personas que se atrevieron a mirar hacia adentro y transformar su realidad.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="group relative px-6 py-3 bg-slate-900 text-white rounded-full font-medium overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-900/20"
            >
              <span className="relative z-10 flex items-center gap-2">
                Dejar mi historia
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <div
              key={t.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4 mb-3">
                {t.photoUrl ? (
                  <Image src={t.photoUrl} alt={t.author} width={40} height={40} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white uppercase text-lg shrink-0">
                    {t.author.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-[15px]">{t.author}</h3>
                  <div className="text-[13px] text-slate-500 mt-0.5">
                    {t.roles.length > 0 ? t.roles[0] : 'Alumno/a'} • {new Date(t.createdAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="shrink-0 flex items-start justify-end">
                  <div className="w-6 h-6"><FcGoogle size="100%" /></div>
                </div>
              </div>

              {renderStars(t.rating)}

              <p className="text-[15px] text-slate-700 leading-relaxed font-sans flex-1 line-clamp-6">
                {t.quote}
              </p>
            </div>
          ))}

          {/* Empty State / CTA Card */}
          {testimonials.length < 3 && (
            <div
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 flex flex-col justify-center items-center h-full cursor-pointer min-h-[250px]"
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="w-6 h-6"><FcGoogle size="100%" /></div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Dejanos tu reseña</h3>
              <p className="text-slate-500 text-center text-sm">Tu experiencia ayuda a otros a dar el paso.</p>
            </div>
          )}
        </div>

      </div>

      <TestimonialFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default Testimonials;