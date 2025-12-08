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
              Nuestros encuentros se realizan en un espacio diseñado para la calma, el silencio y la introspección. Un refugio en medio de la ciudad donde el tiempo se detiene.
            </p>

            <div className="inline-block bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 max-w-sm">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white mr-3">
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
                <span className="font-bold text-slate-900 mr-2 text-xl">4.8</span>
                <div className="flex mr-2">
                  {Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} className="h-4 w-4 text-amber-400" />)}
                </div>
                <span className="text-slate-400 text-xs">(120+ Reseñas)</span>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Decorative outline behind map */}
            <div className="absolute -inset-4 border-2 border-slate-100 rounded-2xl z-0 transform rotate-2"></div>

            <div className="rounded-xl shadow-2xl overflow-hidden h-96 md:h-[600px] bg-white relative z-10 border border-slate-200">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3284.016546660654!2d-58.3762715497332!3d-34.608545950193516!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bccacf768f9013%3A0xb0285525a162552e!2sAv.%20de%20Mayo%20695%2C%20C1084%20CABA!5e0!3m2!1ses!2sar"
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