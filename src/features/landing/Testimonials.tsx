import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Testimonial } from '../../core/types';
import StarIcon from '../../ui/icons/StarIcon';
import TestimonialFormModal from './TestimonialFormModal';

interface TestimonialsProps {
  onTestimonialClick: (testimonial: Testimonial) => void;
  onAddTestimonialClick: () => void;
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
      <div className="flex gap-1 mb-6">
        {[0, 1, 2, 3, 4].map((index) => {
          const filled = rating > index;
          const half = rating > index && rating < index + 1;
          return (
            <StarIcon
              key={index}
              className={`w-5 h-5 ${filled || half ? 'text-yellow-400' : 'text-slate-200'}`}
              fill={half ? 'half' : (filled ? 'full' : 'none')}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section id="voices" className="py-24 relative bg-transparent">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <div
              key={t.id}
              className="group relative bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col justify-between h-full"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Decorative Quote Mark */}
              <div className="absolute top-6 right-8 text-slate-100 group-hover:text-blue-50 transition-colors duration-300">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 7.55228 14.017 7V3H19.017C20.6739 3 22.017 4.34315 22.017 6V15C22.017 16.6569 20.6739 18 19.017 18H16.017V21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 7.55228 5.0166 7V3H10.0166C11.6735 3 13.0166 4.34315 13.0166 6V15C13.0166 16.6569 11.6735 18 10.0166 18H7.0166V21H5.0166Z" />
                </svg>
              </div>

              <div>
                {renderStars(t.rating)}

                <p className="text-lg text-slate-700 leading-relaxed font-serif italic mb-8 relative z-10">
                  "{t.quote}"
                </p>
              </div>

              <div className="flex items-center gap-4 pt-6 border-t border-slate-50">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase text-sm">
                  {t.author.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{t.author}</h3>
                  {t.roles.length > 0 && <p className="text-xs text-slate-500">{t.roles[0]}</p>}
                </div>
              </div>

            </div>
          ))}

          {/* Empty State / CTA Card */}
          {testimonials.length < 3 && (
            <div
              onClick={() => setIsModalOpen(true)}
              className="group relative bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 flex flex-col justify-center items-center h-full cursor-pointer min-h-[300px]"
            >
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Tu historia aquí</h3>
              <p className="text-slate-500 text-center text-sm">Sé parte de nuestra comunidad compartiendo tu experiencia.</p>
            </div>
          )}
        </div>

      </div>

      <TestimonialFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default Testimonials;