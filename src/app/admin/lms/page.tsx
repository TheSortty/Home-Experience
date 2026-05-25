import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  IoArrowBackOutline, IoBookOutline, IoChevronForwardOutline,
  IoPeopleOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoCheckmarkCircle, IoEllipseOutline,
} from 'react-icons/io5';
import { isAdminRole } from '@/src/services/roleService';

export default async function AdminLmsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (!isAdminRole(profile?.role ?? '')) redirect('/dashboard');

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, is_published')
    .order('title');

  const courseList = courses || [];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            <IoArrowBackOutline size={16} />
            <span className="hidden sm:inline">Volver al campus</span>
            <span className="sm:hidden">Atrás</span>
          </Link>

          <div className="w-px h-5 bg-slate-200 shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">Campus LMS</p>
            <p className="text-xs text-slate-400 hidden sm:block">Cursos, clases y entregas</p>
          </div>

          <Link
            href="/admin/lms/actividad"
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors shrink-0"
          >
            <IoPeopleOutline size={14} />
            <span className="hidden sm:inline">Actividad de alumnos</span>
            <span className="sm:hidden">Actividad</span>
          </Link>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Programas</h1>
          <p className="text-sm text-slate-500 mt-1">
            {courseList.length === 0
              ? 'No hay programas creados todavía.'
              : `${courseList.length} programa${courseList.length !== 1 ? 's' : ''} en el campus`}
          </p>
        </div>

        {courseList.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-14 text-center">
            <IoBookOutline size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">No hay programas creados todavía.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {courseList.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all"
              >
                {/* Course header */}
                <div className="flex items-start gap-4 p-5">
                  <div className="w-11 h-11 rounded-xl bg-[#00A9CE]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <IoBookOutline size={20} className="text-[#00A9CE]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 flex-wrap">
                      <p className="font-bold text-slate-900 text-base leading-tight flex-1 min-w-0">
                        {course.title}
                      </p>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        course.is_published
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {course.is_published
                          ? <><IoCheckmarkCircle size={10} /> Publicado</>
                          : <><IoEllipseOutline size={10} /> Borrador</>
                        }
                      </span>
                    </div>
                    {course.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions footer */}
                <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/admin/lms/${course.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    <IoSettingsOutline size={13} />
                    Configurar clases
                  </Link>
                  <Link
                    href={`/admin/lms/${course.id}/entregas`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:border-[#00A9CE] hover:text-[#00A9CE] transition-all"
                  >
                    <IoDocumentTextOutline size={13} />
                    Ver entregas
                  </Link>
                  <Link
                    href={`/admin/lms/actividad?course=${course.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:border-slate-300 hover:text-slate-700 transition-colors ml-auto"
                  >
                    <IoPeopleOutline size={13} />
                    Actividad
                    <IoChevronForwardOutline size={11} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
