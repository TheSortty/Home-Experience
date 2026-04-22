import React from 'react';
import { IoPeopleOutline, IoChatbubbleEllipsesOutline, IoSearchOutline } from 'react-icons/io5';

export default function CampusComunidadPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* HEADER */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <IoPeopleOutline className="text-[#00A9CE]" /> Comunidad
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Conectá, compartí y aprendé con otros estudiantes.</p>
        </div>
        
        <button className="bg-[#00A9CE] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm">
          + Nuevo Debate
        </button>
      </section>

      {/* TABS Y BUSCADOR */}
      <section className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex bg-slate-200 p-1 rounded-lg w-fit">
          <button className="px-4 py-1.5 rounded-md bg-white text-slate-900 text-sm font-bold shadow-sm">General</button>
          <button className="px-4 py-1.5 rounded-md text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors">Programa Inicial</button>
          <button className="px-4 py-1.5 rounded-md text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors">CRESER</button>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-full px-4 py-2 w-full md:w-64">
          <IoSearchOutline className="text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar temas..." 
            className="bg-transparent border-none outline-none flex-1 ml-2 text-sm text-slate-700"
          />
        </div>
      </section>

      {/* LISTA DE DEBATES */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        
        {/* Post 1 */}
        <div className="p-6 hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
              MG
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900 mb-1">Duda sobre las distinciones del Módulo 2</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                Hola a todos. Estuve repasando la última clase y me quedó una duda sobre cómo aplicar la distinción de juicios y afirmaciones en una conversación difícil con un compañero de trabajo. ¿Alguien tiene algún ejemplo práctico?
              </p>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                <span className="text-[#00A9CE]">María Gómez</span>
                <span>hace 2 horas</span>
                <span className="flex items-center gap-1"><IoChatbubbleEllipsesOutline size={16} /> 4 respuestas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Post 2 */}
        <div className="p-6 hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
              JP
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900 mb-1">Compartiendo mi experiencia de la semana</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                Quería compartirles que hoy pude finalmente tener esa charla pendiente usando las herramientas que vimos el martes. ¡Fue increíble la diferencia en el resultado!
              </p>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                <span className="text-[#00A9CE]">Juan Pérez</span>
                <span>ayer</span>
                <span className="flex items-center gap-1"><IoChatbubbleEllipsesOutline size={16} /> 12 respuestas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State / Cargar más */}
        <div className="p-4 text-center">
          <button className="text-sm font-bold text-slate-500 hover:text-slate-900">
            Cargar debates anteriores
          </button>
        </div>

      </section>
    </div>
  );
}
