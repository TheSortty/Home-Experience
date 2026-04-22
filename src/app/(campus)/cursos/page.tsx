import React from 'react';
import Link from 'next/link';

export default function CampusCursosPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* HEADER */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mis Programas</h1>
          <p className="text-slate-500 mt-1 font-medium">Gestioná tus cursos y seguí tu progreso de aprendizaje.</p>
        </div>
        
        {/* Filtros simples (UI) */}
        <div className="flex bg-slate-200 p-1 rounded-lg w-fit">
          <button className="px-4 py-1.5 rounded-md bg-white text-slate-900 text-sm font-bold shadow-sm">Activos</button>
          <button className="px-4 py-1.5 rounded-md text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors">Completados</button>
          <button className="px-4 py-1.5 rounded-md text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors">Todos</button>
        </div>
      </section>

      {/* GRID DE CURSOS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Curso 1 */}
        <Link href="/cursos/programa-inicial" className="group">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full group-hover:border-[#00A9CE]/50 group-hover:shadow-md transition-all">
            <div className="h-40 bg-gradient-to-r from-[#00A9CE] to-blue-600 relative overflow-hidden">
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-md text-white text-xs font-bold uppercase tracking-wider">
                En curso
              </div>
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#00A9CE] transition-colors">Programa Inicial</h3>
              <p className="text-sm text-slate-500 mb-6 line-clamp-3">
                Un recorrido intensivo por los conceptos fundamentales del coaching ontológico, enfocado en el rediseño personal y la transformación de tus observadores.
              </p>
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  <span>3 Módulos</span>
                  <span>12 Clases</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00A9CE] rounded-full" style={{ width: '45%' }}></div>
                </div>
                <p className="text-right text-xs text-slate-400 mt-2 font-medium">45% Completado</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Curso 2 */}
        <Link href="/cursos/programa-avanzado" className="group">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full group-hover:border-emerald-500/50 group-hover:shadow-md transition-all opacity-70">
            <div className="h-40 bg-gradient-to-r from-emerald-400 to-teal-500 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="px-3 py-1.5 bg-white rounded-lg text-emerald-600 text-sm font-bold shadow-lg">
                  Próximamente
                </div>
              </div>
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">Programa Avanzado</h3>
              <p className="text-sm text-slate-500 mb-6 line-clamp-3">
                Profundiza en las distinciones y adquiere herramientas de liderazgo y gestión de equipos para tu vida personal y profesional.
              </p>
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  <span>Pendiente de inicio</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-300 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Curso Nuevo/Upsell */}
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-8 text-center hover:bg-slate-100 hover:border-slate-400 transition-colors cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm mb-4">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="28px" width="28px" xmlns="http://www.w3.org/2000/svg"><path fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M256 112v288m144-144H112"></path></svg>
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Descubrí más programas</h3>
          <p className="text-sm text-slate-500">Explorá nuestro catálogo y continuá tu camino de aprendizaje.</p>
        </div>

      </section>

    </div>
  );
}
