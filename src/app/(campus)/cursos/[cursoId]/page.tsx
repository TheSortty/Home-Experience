import React from 'react';
import Link from 'next/link';
import { IoArrowBackOutline, IoPlayCircleOutline, IoCheckmarkCircle, IoLockClosedOutline, IoDocumentTextOutline } from 'react-icons/io5';

export default function CursoDetallePage({ params }: { params: { cursoId: string } }) {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* VOLVER */}
      <div>
        <Link href="/cursos" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#00A9CE] transition-colors mb-4">
          <IoArrowBackOutline /> Volver a Mis Programas
        </Link>
      </div>

      {/* HERO DEL CURSO */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row relative">
        <div className="w-full md:w-1/3 h-48 md:h-auto bg-gradient-to-br from-[#00A9CE] to-blue-700 flex items-center justify-center p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <h1 className="text-3xl md:text-4xl font-black text-white relative z-10 leading-tight">Programa Inicial</h1>
        </div>
        
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-md">En Curso</span>
            <span className="text-sm font-medium text-slate-500">12 Clases • 4 Semanas</span>
          </div>
          
          <p className="text-slate-600 text-base mb-6 leading-relaxed">
            Un recorrido intensivo por los conceptos fundamentales del coaching ontológico, enfocado en el rediseño personal y la transformación de tus observadores.
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-700">
              <span>Progreso General</span>
              <span className="text-[#00A9CE]">45%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#00A9CE] rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO DEL CURSO (MÓDULOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        
        {/* LISTA DE MÓDULOS (Ocupa 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Contenido del Programa</h2>

          <div className="space-y-4">
            {/* Módulo 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Módulo 1</p>
                  <h3 className="text-lg font-bold text-slate-900">Bases del Coaching Ontológico</h3>
                </div>
                <div className="text-emerald-500 font-bold text-sm flex items-center gap-1">
                  <IoCheckmarkCircle size={20} /> 3/3
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {/* Lección completada */}
                <Link href={`/cursos/programa-inicial/clase-1`} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <IoCheckmarkCircle size={24} className="text-emerald-500" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-[#00A9CE] transition-colors">1. Introducción al Observador</p>
                      <p className="text-xs text-slate-500 mt-0.5"><IoPlayCircleOutline className="inline mr-1"/> Video • 45 min</p>
                    </div>
                  </div>
                </Link>
                <Link href={`/cursos/programa-inicial/clase-2`} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <IoCheckmarkCircle size={24} className="text-emerald-500" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-[#00A9CE] transition-colors">2. Lenguaje, Cuerpo y Emoción</p>
                      <p className="text-xs text-slate-500 mt-0.5"><IoPlayCircleOutline className="inline mr-1"/> Video • 60 min</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Módulo 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-[#00A9CE]">
              <div className="p-5 bg-white border-b border-slate-100 flex justify-between items-center cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-[#00A9CE] uppercase tracking-widest mb-1">Módulo 2 (Actual)</p>
                  <h3 className="text-lg font-bold text-slate-900">Actos Lingüísticos</h3>
                </div>
                <div className="text-slate-500 font-bold text-sm">
                  1/4
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                <Link href={`/cursos/programa-inicial/clase-3`} className="flex items-center justify-between p-4 bg-[#00A9CE]/5 hover:bg-[#00A9CE]/10 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full border-2 border-[#00A9CE] flex items-center justify-center">
                      <div className="w-2 h-2 bg-[#00A9CE] rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#00A9CE]">1. Afirmaciones y Declaraciones</p>
                      <p className="text-xs text-slate-500 mt-0.5"><IoPlayCircleOutline className="inline mr-1"/> Video • 50 min</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-white text-[#00A9CE] px-2 py-1 rounded shadow-sm border border-[#00A9CE]/20">Continuar</span>
                </Link>
                <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-4">
                    <IoLockClosedOutline size={24} className="text-slate-400" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">2. Juicios y Creencias Limitantes</p>
                      <p className="text-xs text-slate-500 mt-0.5">Bloqueado hasta completar clase anterior</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* SIDEBAR DEL CURSO (Recursos, etc) */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <IoDocumentTextOutline className="text-[#00A9CE] text-xl" /> Material del Curso
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="flex items-start gap-3 group">
                  <div className="p-2 bg-red-50 text-red-500 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <IoDocumentTextOutline size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-[#00A9CE] transition-colors">Cuadernillo de Trabajo PDF</p>
                    <p className="text-xs text-slate-500">2.4 MB</p>
                  </div>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-start gap-3 group">
                  <div className="p-2 bg-blue-50 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <IoDocumentTextOutline size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-[#00A9CE] transition-colors">Bibliografía Recomendada</p>
                    <p className="text-xs text-slate-500">Enlaces web</p>
                  </div>
                </a>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
