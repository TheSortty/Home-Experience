'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { IoArrowBackOutline, IoPlayCircleOutline, IoCheckmarkCircle, IoLockClosedOutline, IoDocumentTextOutline, IoTimeOutline, IoChevronForwardOutline } from 'react-icons/io5';

export default function ClaseDetallePage({ params }: { params: { cursoId: string, claseId: string } }) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumen' | 'materiales' | 'foro'>('resumen');

  return (
    <div className="max-w-7xl mx-auto pb-12">
      
      {/* VOLVER Y BREADCRUMBS */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Link href="/cursos" className="hover:text-[#00A9CE] transition-colors">Mis Programas</Link>
          <IoChevronForwardOutline size={14} />
          <Link href={`/cursos/${params.cursoId}`} className="hover:text-[#00A9CE] transition-colors">Programa Inicial</Link>
          <IoChevronForwardOutline size={14} />
          <span className="text-slate-900 font-bold">1. Afirmaciones y Declaraciones</span>
        </div>
        
        <Link href={`/cursos/${params.cursoId}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#00A9CE] transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
          <IoArrowBackOutline /> Volver al Temario
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* COLUMNA PRINCIPAL (VIDEO Y DETALLES) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* REPRODUCTOR DE VIDEO */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 aspect-video relative flex items-center justify-center group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
              <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop" alt="Clase" className="w-full h-full object-cover opacity-40 mix-blend-overlay" />
            </div>
            
            <div className="relative z-10 w-20 h-20 bg-[#00A9CE]/90 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(0,169,206,0.5)] group-hover:scale-110 group-hover:bg-[#00A9CE] transition-all duration-300">
              <IoPlayCircleOutline size={48} className="ml-1" />
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent flex items-end px-4 pb-3">
              <div className="w-full flex items-center gap-4">
                <IoPlayCircleOutline className="text-white text-2xl" />
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-[#00A9CE] rounded-full"></div>
                </div>
                <span className="text-white text-xs font-medium">12:34 / 50:00</span>
              </div>
            </div>
          </div>

          {/* HEADER DE LA CLASE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-[#00A9CE]/10 text-[#00A9CE] text-xs font-bold uppercase tracking-wider rounded-md">Módulo 2</span>
                  <span className="text-sm font-medium text-slate-500 flex items-center gap-1"><IoTimeOutline /> 50 mins</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">1. Afirmaciones y Declaraciones</h1>
                <p className="text-slate-600">Aprende a distinguir entre describir el mundo y crear una nueva realidad a través del lenguaje.</p>
              </div>

              {/* BOTÓN MARCAR COMO COMPLETADO */}
              <button 
                onClick={() => setIsCompleted(!isCompleted)}
                className={`shrink-0 px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 ${isCompleted ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-[#00A9CE] text-white hover:bg-blue-600 hover:shadow-md'}`}
              >
                {isCompleted ? <><IoCheckmarkCircle size={20} /> Clase Completada</> : <><IoCheckmarkCircle size={20} /> Marcar como Terminada</>}
              </button>
            </div>
          </div>

          {/* PESTAÑAS (TABS) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('resumen')}
                className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'resumen' ? 'text-[#00A9CE] border-b-2 border-[#00A9CE] bg-slate-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                Resumen
              </button>
              <button 
                onClick={() => setActiveTab('materiales')}
                className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'materiales' ? 'text-[#00A9CE] border-b-2 border-[#00A9CE] bg-slate-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                Materiales (2)
              </button>
              <button 
                onClick={() => setActiveTab('foro')}
                className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'foro' ? 'text-[#00A9CE] border-b-2 border-[#00A9CE] bg-slate-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                Foro
              </button>
            </div>
            
            <div className="p-6 md:p-8 min-h-[300px]">
              {activeTab === 'resumen' && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Sobre esta clase</h3>
                  <div className="prose prose-slate max-w-none text-slate-600">
                    <p>En esta sesión profundizaremos en dos de los actos lingüísticos fundamentales del coaching ontológico:</p>
                    <ul>
                      <li><strong>Las Afirmaciones:</strong> Nuestra forma de describir el mundo de los hechos. Cómo fundamentarlas y validarlas.</li>
                      <li><strong>Las Declaraciones:</strong> El poder generativo del lenguaje. Cómo nuestras palabras pueden transformar nuestra realidad y generar nuevos contextos.</li>
                    </ul>
                    <p className="mt-4">Recuerda descargar el cuadernillo de trabajo en la pestaña de "Materiales" para completar los ejercicios prácticos de esta semana.</p>
                  </div>
                </div>
              )}

              {activeTab === 'materiales' && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <IoDocumentTextOutline className="text-[#00A9CE] text-xl" /> Material Descargable
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <a href="#" className="flex items-center gap-4 group p-4 border border-slate-200 rounded-xl hover:border-[#00A9CE] hover:shadow-sm transition-all bg-white">
                        <div className="p-3 bg-red-50 text-red-500 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                          <IoDocumentTextOutline size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-[#00A9CE] transition-colors">Cuadernillo de Trabajo PDF</p>
                          <p className="text-xs text-slate-500">2.4 MB • Documento PDF</p>
                        </div>
                        <span className="text-xs font-bold text-[#00A9CE] bg-[#00A9CE]/10 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">Descargar</span>
                      </a>
                    </li>
                    <li>
                      <a href="#" className="flex items-center gap-4 group p-4 border border-slate-200 rounded-xl hover:border-[#00A9CE] hover:shadow-sm transition-all bg-white">
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          <IoDocumentTextOutline size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-[#00A9CE] transition-colors">Bibliografía Recomendada</p>
                          <p className="text-xs text-slate-500">Enlaces web externos</p>
                        </div>
                        <span className="text-xs font-bold text-[#00A9CE] bg-[#00A9CE]/10 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">Ver Enlaces</span>
                      </a>
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === 'foro' && (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="32px" width="32px" xmlns="http://www.w3.org/2000/svg"><path d="M256 32C114.6 32 0 125.1 0 240c0 49.6 21.4 95 57 130.7C44.5 421.1 22.7 481 22 483c-1.4 4.5-.8 9.6 1.9 13.5 2.7 3.9 7 6.2 11.6 6.2 60.1 0 115.8-24.8 155-46.3 21 3.5 42.9 5.3 65.5 5.3 141.4 0 256-93.1 256-208S397.4 32 256 32z"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Comunidad del Programa</h3>
                  <p className="text-sm text-slate-500 max-w-sm">Próximamente podrás interactuar con profesores y compañeros de cursada directamente desde aquí.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* SIDEBAR (LISTA DE CLASES) */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
            <div className="p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900">Contenido del Curso</h3>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Progreso: {isCompleted ? '50%' : '45%'}</span>
                  <span>{isCompleted ? '5/12' : '4/12'} Clases</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden transition-all duration-500">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: isCompleted ? '50%' : '45%' }}></div>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
              {/* MODULO 1 */}
              <div className="border-b border-slate-100">
                <div className="px-5 py-3 bg-slate-50/50 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Módulo 1</span>
                  <IoCheckmarkCircle className="text-emerald-500" size={16} />
                </div>
                <div className="divide-y divide-slate-50">
                  <Link href="/cursos/programa-inicial/clase-1" className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors">
                    <IoCheckmarkCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">1. Introducción al Observador</p>
                      <p className="text-xs text-slate-500 mt-1">45 min</p>
                    </div>
                  </Link>
                  <Link href="/cursos/programa-inicial/clase-2" className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors">
                    <IoCheckmarkCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">2. Lenguaje, Cuerpo y Emoción</p>
                      <p className="text-xs text-slate-500 mt-1">60 min</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* MODULO 2 */}
              <div className="border-b border-slate-100 border-l-4 border-l-[#00A9CE]">
                <div className="px-5 py-3 bg-white flex justify-between items-center">
                  <span className="text-xs font-bold text-[#00A9CE] uppercase tracking-wider">Módulo 2</span>
                  <span className="text-xs font-bold text-slate-400">1/4</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {/* CLASE ACTUAL */}
                  <div className="flex items-start gap-3 p-4 bg-[#00A9CE]/5 cursor-default relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00A9CE]"></div>
                    {isCompleted ? (
                      <IoCheckmarkCircle size={20} className="text-emerald-500 shrink-0 mt-0.5 ml-1 z-10" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#00A9CE] flex items-center justify-center shrink-0 mt-0.5 bg-white ml-1 z-10">
                        <div className="w-2 h-2 bg-[#00A9CE] rounded-full"></div>
                      </div>
                    )}
                    <div>
                      <p className={`text-sm font-bold ${isCompleted ? 'text-slate-900' : 'text-[#00A9CE]'}`}>1. Afirmaciones y Declaraciones</p>
                      <p className={`text-xs mt-1 flex items-center gap-1 ${isCompleted ? 'text-slate-500' : 'text-[#00A9CE]/70'}`}>
                        {isCompleted ? 'Completada' : <><IoPlayCircleOutline /> Reproduciendo</>}
                      </p>
                    </div>
                  </div>
                  
                  {/* CLASE BLOQUEADA */}
                  <div className={`flex items-start gap-3 p-4 transition-opacity ${isCompleted ? 'hover:bg-slate-50 cursor-pointer opacity-100' : 'opacity-50 cursor-not-allowed'}`}>
                    {isCompleted ? (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 mt-0.5"></div>
                    ) : (
                      <IoLockClosedOutline size={20} className="text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">2. Juicios y Creencias Limitantes</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {isCompleted ? '55 min' : 'Bloqueado hasta completar clase anterior'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

      </div>

    </div>
  );
}
