import React from 'react';

const Contact: React.FC = () => {
  return (
    <section id="contact" className="pb-12 border-b border-slate-100">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-slate-900 mb-12 font-serif">Contáctanos</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <h4 className="font-bold text-slate-900 mb-4">Sede Central</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Av de Mayo 695<br />
              CABA, Argentina<br />
              C1084
            </p>
          </div>
          <div className="md:col-span-1">
            <h4 className="font-bold text-slate-900 mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="mailto:contacto@siendohome.com" className="hover:text-blue-600">contacto@siendohome.com</a></li>
            </ul>
          </div>
          <div className="md:col-span-2 flex md:justify-end items-end">
            <p className="text-xl md:text-2xl font-serif text-slate-400 italic max-w-sm text-right">
              "El viaje más largo es el que se hace hacia adentro."
            </p>
          </div>
        </div>

        <div className="mt-24">
          <h1 className="text-[15vw] leading-none font-bold tracking-tighter text-slate-100 select-none text-center">
            HOME
          </h1>
        </div>
      </div>
    </section>
  );
};

export default Contact;