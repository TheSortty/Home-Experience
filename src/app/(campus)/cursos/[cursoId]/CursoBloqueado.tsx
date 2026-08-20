import Link from 'next/link';
import {
  IoArrowBackOutline, IoLockClosedOutline, IoChatbubbleEllipsesOutline,
  IoSparklesOutline, IoPeopleOutline, IoLibraryOutline,
} from 'react-icons/io5';
import { normalizeImageUrl } from '@/src/services/imageUrl';
import { whatsappHref } from '@/src/services/contact';

/**
 * Vidriera de un programa que el alumno todavía no tiene asignado.
 *
 * Se ve que existe y de qué va (título, portada, descripción), pero nada del
 * contenido: módulos, clases, materiales y foro quedan del otro lado. El
 * bloqueo real lo hace el RLS — esta pantalla sólo lo cuenta bien.
 */
export default function CursoBloqueado({
  course,
}: {
  course: { id: string; title: string; description: string | null; cover_image_url: string | null };
}) {
  const coverSrc = normalizeImageUrl(course.cover_image_url, 'w1200');

  return (
    <div className="space-y-8 pb-12">

      <div>
        <Link
          href="/cursos"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#00A9CE] transition-colors"
        >
          <IoArrowBackOutline /> Volver a Mis Programas
        </Link>
      </div>

      {/* HERO bloqueado */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 min-h-[180px] relative overflow-hidden flex items-center justify-center p-8 text-center">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt=""
              className="absolute inset-0 w-full h-full object-cover grayscale opacity-60"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500 to-slate-700" />
          )}
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow">
              <IoLockClosedOutline size={22} className="text-slate-600" />
            </div>
            <h1 className="text-2xl font-black text-white leading-tight drop-shadow-md">
              {course.title}
            </h1>
          </div>
        </div>

        <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-600 w-fit mb-3">
            Todavía no es parte de tu camino
          </span>
          <p className="text-slate-600 leading-relaxed">
            {course.description
              ?? 'Este programa forma parte del campus, pero todavía no lo tenés asignado.'}
          </p>
          <p className="text-sm text-slate-400 mt-3 font-serif italic">
            Cuando te sumes, se abre acá mismo: las clases, los materiales y el foro del grupo.
          </p>
        </div>
      </div>

      {/* Qué se abre al sumarse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { Icon: IoLibraryOutline, title: 'Clases y materiales', text: 'Todo el recorrido, ordenado y disponible cuando quieras.' },
          { Icon: IoPeopleOutline, title: 'El foro del grupo', text: 'Las conversaciones de tu camada y las devoluciones del equipo.' },
          { Icon: IoSparklesOutline, title: 'Tu progreso', text: 'Entregas, cuadernos de campo y seguimiento personalizado.' },
        ].map(({ Icon, title, text }) => (
          <div key={title} className="bg-white rounded-2xl border border-slate-200 p-5">
            <Icon size={20} className="text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-700 mb-1">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-cream border border-cream-deep rounded-2xl p-8 text-center">
        <h2 className="font-serif text-2xl font-medium tracking-tight text-ink mb-2">
          ¿Querés sumarte?
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-5 leading-relaxed">
          Escribinos y te contamos cómo es el programa, cuándo arranca la próxima camada y qué necesitás para empezar.
        </p>
        <a
          href={whatsappHref(`¡Hola! Me interesa sumarme a "${course.title}" en el campus de HOME.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors"
        >
          <IoChatbubbleEllipsesOutline size={16} />
          Consultar por este programa
        </a>
      </div>
    </div>
  );
}
