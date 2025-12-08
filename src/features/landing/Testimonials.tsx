import React from 'react';
import { ElegantArrowIcon } from './decorations/ElegantDecorations';
import { MockDatabase } from '../../services/mockDatabase';
import { supabase } from '../../services/supabaseClient';
import { Testimonial } from '../../core/types';
import { TESTIMONIALS } from '../../core/constants';
import StarIcon from '../../ui/icons/StarIcon';

interface TestimonialsProps {
  onTestimonialClick: (testimonial: Testimonial) => void;
  onAddTestimonialClick: () => void;
  onViewAllClick: () => void;
}

const Testimonials: React.FC<TestimonialsProps> = ({ onTestimonialClick, onAddTestimonialClick, onViewAllClick }) => {
  const [testimonials, setTestimonials] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from('testimonials')
        .select('*')
        .eq('status', 'approved')
        .limit(3);

      if (data && data.length > 0) {
        const mappedData = data.map((t: any) => ({
          id: t.id,
          author: t.author_name,            // Fixed: name -> author
          quote: t.quote,                   // Fixed: message -> quote
          roles: t.roles || [],             // Fixed: role string -> roles array
          cycle: t.cycle_text,
          status: t.status,
          rating: t.rating || 5,
          photoUrl: t.photo_url,
          createdAt: t.created_at
        }));
        setTestimonials(mappedData);
      } else {
        setTestimonials([]);
      }
    };
    fetchTestimonials();
  }, []);

  return (
    <section id="voices" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">Voces de la Comunidad</h2>
            <p className="text-slate-600 max-w-xl">Historias reales de personas que se atrevieron a mirar hacia adentro.</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onAddTestimonialClick}
              className="px-6 py-3 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              Dejar testimonio
            </button>
            <button
              onClick={onViewAllClick}
              className="px-6 py-3 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Ver todas las historias
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-6 pb-8 -mx-6 px-6 md:grid md:grid-cols-3 md:gap-8 md:pb-0 md:mx-0 md:px-0">
          {testimonials.map((t) => (
            <div key={t.id} className="flex-shrink-0 w-[85vw] md:w-auto snap-center group cursor-pointer bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300" onClick={() => onTestimonialClick(t)}>
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4 text-slate-900" />
                ))}
              </div>
              <p className="text-base md:text-lg text-slate-700 leading-relaxed mb-6 italic">"{t.quote?.substring(0, 120)}..."</p>
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <h3 className="font-bold text-slate-900">{t.author}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{t.roles.join(', ')}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <ElegantArrowIcon className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;