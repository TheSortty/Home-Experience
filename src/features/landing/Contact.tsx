import React from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';

const Contact: React.FC = () => {
  const { getValue, loading } = useSiteSettings();
  const email = 'info@siendohome.com';
  const phone = '+54 9 11 3058-6930';

  return (
    <section id="contact" className="py-24 border-b border-slate-100 bg-white">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-16 uppercase tracking-tight">
          Contáctanos
        </h2>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 md:gap-24">
          {/* Email Section */}
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-all duration-500 group">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-celeste-strong transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Envíanos un correo</h4>
            <a href={`mailto:${email}`} className="text-2xl md:text-3xl font-serif font-bold text-slate-800 hover:text-celeste-strong transition-colors break-all">
              {email}
            </a>
          </div>

          {/* Phone Section */}
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-all duration-500 group">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-celeste-strong transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </div>
            <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Llámanos o escríbenos</h4>
            <a href={`https://wa.me/5491130586930`} target="_blank" rel="noopener noreferrer" className="text-2xl md:text-3xl font-serif font-bold text-slate-800 hover:text-celeste-strong transition-colors">
              {phone}
            </a>
          </div>
        </div>

        <div className="mt-24 pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900">Sede Central</h4>
            <p className="text-sm text-slate-500 leading-relaxed uppercase tracking-widest">
              Pasaje Belgrano • Av de Mayo 695<br />
              CABA, Argentina
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2">
            <p className="text-xl md:text-2xl font-serif text-slate-300 italic">
              "El viaje más largo es el que se hace hacia adentro."
            </p>
            <h1 className="text-[12vw] md:text-[8vw] leading-none font-bold tracking-tighter text-slate-50 opacity-50 select-none">
              HOME
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;