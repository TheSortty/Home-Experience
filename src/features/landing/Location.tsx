import React from 'react';
import StarIcon from '../../ui/icons/StarIcon';

const Location: React.FC = () => {
  return (
    <section
      id="location"
      className="relative py-24 md:py-40 overflow-hidden"
    >
      {/* Background Decorative Details (Subtle) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 z-0"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-slate-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 z-0"></div>

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="text-center md:text-left">
            <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold tracking-widest text-slate-500 mb-6 uppercase">
              Nuestro Espacio
            </div>
            <h2 className="font-serif text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              Un lugar para encontrarte.
            </h2>
            <p className="text-xl text-slate-600 leading-loose mb-8 font-light">
              Ubicado en el emblemático Pasaje Belgrano, un refugio de silencio y arquitectura histórica en pleno centro porteño. Nuestros encuentros se realizan en un espacio diseñado para la pausa y la introspección.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="mt-1 w-8 h-8 rounded-lg bg-celeste-strong/10 flex items-center justify-center text-celeste-strong flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" /><path d="M18 18h3s1-1 1-2V7a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v8c0 1 1 2 1 2h3" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Colectivos</p>
                  <p className="text-slate-500 text-xs leading-relaxed">7, 8, 10, 22, 24, 28, 29, 33, 50, 56, 62, 64, 86, 91, 103, 105, 111, 126, 130, 143, 146, 152</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 w-8 h-8 rounded-lg bg-celeste-strong/10 flex items-center justify-center text-celeste-strong flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="2" rx="2" /><path d="M4 18h16" /><path d="M8 22l-2-4" /><path d="M16 22l2-4" /><path d="M12 2v16" /></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Subte</p>
                  <p className="text-slate-500 text-xs leading-relaxed">Línea A (Piedras), Línea E (Bolívar/Belgrano)</p>
                </div>
              </div>
            </div>

            <a 
              href="https://g.page/r/CTDkXEC05638EAE"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 max-w-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-900 group-hover:bg-blue-600 transition-colors flex items-center justify-center text-white mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">Sede Central HOME</p>
                  <p className="text-slate-500 text-sm">Av de Mayo 695, CABA</p>
                </div>
              </div>

              <div className="flex items-center pt-4 border-t border-slate-100">
                <span className="font-bold text-slate-900 mr-2 text-xl">5.0</span>
                <div className="flex mr-2">
                  {Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} className="h-4 w-4 text-amber-400" fill="full" />)}
                </div>
                <span className="text-slate-400 text-xs">(13 Reseñas en Google)</span>
              </div>
            </a>
          </div>

          <div className="relative">
            {/* Decorative outline behind map */}
            <div className="absolute -inset-4 border-2 border-slate-100 rounded-2xl z-0 transform rotate-2"></div>

            <div className="rounded-xl shadow-2xl overflow-hidden h-96 md:h-[600px] bg-white relative z-10 border border-slate-200">
              <iframe
                src="https://maps.google.com/maps?q=Home%20Co-Creando%20Bienestar&t=&z=16&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación de HOME Experience"
                className="grayscale-0 transition-all duration-700"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Location;