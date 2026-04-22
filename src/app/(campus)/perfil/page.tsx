import React from 'react';
import { IoPersonOutline, IoSettingsOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';

export default function CampusPerfilPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      <section className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <IoPersonOutline className="text-[#00A9CE]" /> Mi Perfil
        </h1>
        <p className="text-slate-500 mt-1 font-medium">Gestioná tu información personal y preferencias.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* SIDEBAR PERFIL */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#00A9CE] to-blue-500 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-md">
              AL
            </div>
            <h2 className="text-xl font-bold text-slate-900">Alumno Demo</h2>
            <p className="text-sm text-slate-500 mb-4">student@home.com</p>
            <button className="text-[#00A9CE] text-sm font-bold hover:underline">
              Cambiar foto
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-col">
              <button className="flex items-center gap-3 p-4 bg-slate-50 border-l-4 border-[#00A9CE] text-[#00A9CE] font-bold text-sm">
                <IoPersonOutline size={20} /> Datos Personales
              </button>
              <button className="flex items-center gap-3 p-4 text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors">
                <IoSettingsOutline size={20} /> Preferencias
              </button>
              <button className="flex items-center gap-3 p-4 text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors">
                <IoShieldCheckmarkOutline size={20} /> Seguridad
              </button>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL PERFIL */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Información Personal</h3>
            
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nombre</label>
                  <input type="text" defaultValue="Alumno" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] focus:border-transparent text-slate-900" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Apellido</label>
                  <input type="text" defaultValue="Demo" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] focus:border-transparent text-slate-900" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <input type="email" defaultValue="student@home.com" disabled className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed" />
                <p className="text-xs text-slate-400 mt-1">El correo electrónico no puede modificarse.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Biografía / Acerca de mí</label>
                <textarea rows={4} placeholder="Contale a la comunidad sobre vos..." className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] focus:border-transparent text-slate-900"></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button type="button" className="bg-[#00A9CE] hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
