import React from 'react';
import Link from 'next/link';
import { IoPlayCircleOutline, IoCheckmarkCircleOutline, IoFlameOutline, IoTimeOutline, IoChevronForwardOutline } from 'react-icons/io5';
import { createClient } from '@/utils/supabase/server';

export default async function CampusDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let firstName = 'Alumno';
  let enrollments = [];

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, id')
      .eq('user_id', user.id)
      .single();
    
    if (profile?.first_name) firstName = profile.first_name;

    if (profile?.id) {
      // Fetch user enrollments (Ciclos / Programas)
      const { data: userEnrollments } = await supabase
        .from('enrollments')
        .select(`
          id, 
          status,
          cycles (
            id, name, course_id
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'active');
        
      if (userEnrollments) {
        enrollments = userEnrollments;
      }
    }
  }

  const activeCoursesCount = enrollments.length || 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* SALUDO Y FRASE */}
      <section>
        <h1 className="text-3xl font-bold text-slate-900">Hola, {firstName} 👋</h1>
        <p className="text-slate-500 mt-1 font-medium">"El éxito es la suma de pequeños esfuerzos repetidos día tras día."</p>
      </section>

      {/* MÉTRICAS (Grid de 4) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <IoBookOutline size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Cursos Activos</p>
            <p className="text-2xl font-bold text-slate-900">{activeCoursesCount}</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <IoCheckmarkCircleOutline size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Clases Completadas</p>
            <p className="text-2xl font-bold text-slate-900">0</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
            <IoFlameOutline size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Racha Actual</p>
            <p className="text-2xl font-bold text-slate-900">1 día</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center">
            <IoTimeOutline size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Próxima Sesión</p>
            <p className="text-base font-bold text-slate-900 truncate">Sin eventos</p>
          </div>
        </div>
      </section>

      {/* CONTINUAR DONDE LO DEJÉ */}
      {activeCoursesCount > 0 && (
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Continuar Aprendiendo</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row group cursor-pointer hover:shadow-md transition-shadow">
            <div className="w-full md:w-64 h-48 md:h-auto bg-slate-200 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-[#00A9CE] opacity-90"></div>
              <div className="absolute inset-0 flex items-center justify-center text-white/50">
                <IoPlayCircleOutline size={64} className="group-hover:scale-110 transition-transform duration-300 drop-shadow-lg" />
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wide">
                  {enrollments[0]?.cycles?.name || 'Programa'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Comienza tu viaje</h3>
              <p className="text-slate-500 text-sm mb-6 line-clamp-2">
                Explora el contenido del programa y comienza a aprender hoy mismo.
              </p>
              
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                  <span>Progreso del módulo</span>
                  <span>0%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00A9CE] rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GRID: MIS CURSOS & PRÓXIMAS SESIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Mis Cursos (Ocupa 2 columnas) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Mis Programas</h2>
            <Link href="/cursos" className="text-sm font-medium text-[#00A9CE] hover:underline flex items-center gap-1">
              Ver todos <IoChevronForwardOutline />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.length > 0 ? (
              enrollments.map((enr: any, idx: number) => (
                <div key={enr.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-[#00A9CE]/30 transition-colors">
                  <div className={`h-32 bg-gradient-to-r ${idx % 2 === 0 ? 'from-[#00A9CE] to-blue-600' : 'from-emerald-400 to-teal-500'} relative`}>
                    <div className="absolute top-3 right-3 px-2 py-1 bg-white/20 backdrop-blur-md rounded-md text-white text-xs font-bold">
                      En curso
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">{enr.cycles?.name || 'Programa sin nombre'}</h3>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">Explora los contenidos y recursos disponibles para ti.</p>
                    <div className="mt-auto pt-4 border-t border-slate-100">
                      <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
                        <span>Estado</span>
                        <span className="text-[#00A9CE]">Activo</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-500">
                Aún no estás inscrito en ningún programa activo.
              </div>
            )}
          </div>
        </div>

        {/* Próximas Sesiones (Ocupa 1 columna) */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Agenda Sincrónica</h2>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center text-slate-500 text-sm">
            No tienes sesiones programadas próximamente.
          </div>
          
          <Link href="/calendario" className="block text-center text-sm font-medium text-slate-500 hover:text-slate-900 mt-2">
            Ver calendario completo
          </Link>
        </div>

      </div>
    </div>
  );
}
// Hack para importar el icono faltante en el scope
function IoBookOutline(props: any) {
  return <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M256 160c16-63.16 76.43-95.41 208-96a15.94 15.94 0 0116 16v288a16 16 0 01-16 16c-128 0-177.45 25.81-208 64-30.37-38-80-64-208-64-9.88 0-16-8.05-16-17.93V80a15.94 15.94 0 0116-16c131.57.59 192 32.84 208 96zM256 160v288"></path></svg>;
}
