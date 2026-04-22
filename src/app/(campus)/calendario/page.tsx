import React from 'react';
import { IoCalendarOutline, IoTimeOutline, IoVideocamOutline } from 'react-icons/io5';

export default function CampusCalendarioPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      <section className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <IoCalendarOutline className="text-[#00A9CE]" /> Calendario
        </h1>
        <p className="text-slate-500 mt-1 font-medium">Tus próximas sesiones sincrónicas y eventos de los programas.</p>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="space-y-6">
          
          {/* Mes actual */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider text-sm border-b border-slate-100 pb-2">Abril 2026</h2>
            
            <div className="space-y-3">
              {/* Evento 1 */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-[#00A9CE]/30 hover:shadow-sm transition-all bg-slate-50/50">
                <div className="flex flex-col items-center justify-center w-14 h-14 bg-white rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
                  <span className="text-xs font-bold uppercase text-slate-400">Jue</span>
                  <span className="text-xl font-black text-[#00A9CE] leading-none">23</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-lg text-slate-900">Mentoring Grupal CRESER</h3>
                    <span className="px-2.5 py-1 bg-[#00A9CE]/10 text-[#00A9CE] text-xs font-bold rounded-md w-fit">CRESER</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">Sesión de acompañamiento y revisión de metas semanales.</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                    <span className="flex items-center gap-1"><IoTimeOutline size={16} /> 19:00 - 20:30 hs</span>
                    <span className="flex items-center gap-1"><IoVideocamOutline size={16} /> Vía Zoom</span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                    Unirse a la llamada
                  </button>
                </div>
              </div>

              {/* Evento 2 */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all opacity-70">
                <div className="flex flex-col items-center justify-center w-14 h-14 bg-white rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
                  <span className="text-xs font-bold uppercase text-slate-400">Mar</span>
                  <span className="text-xl font-black text-slate-700 leading-none">28</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-lg text-slate-900">Clase: Herramientas de Gestión</h3>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md w-fit">Prog. Inicial</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mt-3">
                    <span className="flex items-center gap-1"><IoTimeOutline size={16} /> 19:00 - 21:00 hs</span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <button className="bg-slate-100 text-slate-400 cursor-not-allowed px-4 py-2 rounded-lg font-bold text-sm">
                    Agendado
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
