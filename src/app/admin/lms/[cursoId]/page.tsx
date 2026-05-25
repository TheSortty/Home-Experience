import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  IoArrowBackOutline, IoDocumentTextOutline, IoLockClosedOutline,
  IoLockOpenOutline, IoCheckmarkCircle, IoEllipseOutline,
} from 'react-icons/io5';
import { isAdminRole } from '@/src/services/roleService';
import LessonLifecycleForm from './LessonLifecycleForm';

export default async function AdminCursoPage({
  params,
}: {
  params: Promise<{ cursoId: string }>;
}) {
  const { cursoId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (!isAdminRole(profile?.role ?? '')) redirect('/dashboard');

  const { data: course } = await supabase
    .from('courses')
    .select('id, title')
    .eq('id', cursoId)
    .single();

  if (!course) notFound();

  const { data: rawModules } = await supabase
    .from('modules')
    .select(`
      id, title, order_index,
      lessons (
        id, title, order_index, is_published,
        status, unlock_at, unlocked_at, due_days_after_unlock, requires_submission
      )
    `)
    .eq('course_id', cursoId)
    .order('order_index', { ascending: true });

  type Lesson = {
    id: string;
    title: string;
    order_index: number;
    is_published: boolean;
    status: string;
    unlock_at: string | null;
    unlocked_at: string | null;
    due_days_after_unlock: number | null;
    requires_submission: boolean;
  };

  const modules = (rawModules || []).map((m: any) => ({
    ...m,
    lessons: [...(m.lessons || [])].sort((a: Lesson, b: Lesson) => a.order_index - b.order_index),
  }));

  const totalLessons = modules.reduce((acc: number, m: any) => acc + m.lessons.length, 0);
  const publishedLessons = modules.reduce((acc: number, m: any) =>
    acc + m.lessons.filter((l: Lesson) => l.is_published).length, 0);
  const unlockedLessons = modules.reduce((acc: number, m: any) =>
    acc + m.lessons.filter((l: Lesson) => l.status === 'unlocked').length, 0);
  const withSubmission = modules.reduce((acc: number, m: any) =>
    acc + m.lessons.filter((l: Lesson) => l.requires_submission).length, 0);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 flex items-center gap-4">
          <Link
            href="/admin/lms"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            <IoArrowBackOutline size={16} />
            <span className="hidden sm:inline">Programas</span>
            <span className="sm:hidden">Atrás</span>
          </Link>

          <div className="w-px h-5 bg-slate-200 shrink-0" />

          <p className="text-sm font-bold text-slate-900 truncate flex-1 min-w-0">
            {course.title}
          </p>

          <Link
            href={`/admin/lms/${cursoId}/entregas`}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors shrink-0"
          >
            <IoDocumentTextOutline size={14} />
            <span className="hidden sm:inline">Ver Entregas</span>
            <span className="sm:hidden">Entregas</span>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Clases totales', value: totalLessons, icon: <IoEllipseOutline size={14} className="text-slate-400" /> },
            { label: 'Publicadas', value: publishedLessons, icon: <IoCheckmarkCircle size={14} className="text-emerald-500" /> },
            { label: 'Desbloqueadas', value: unlockedLessons, icon: <IoLockOpenOutline size={14} className="text-[#00A9CE]" /> },
            { label: 'Con entrega', value: withSubmission, icon: <IoDocumentTextOutline size={14} className="text-amber-500" /> },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
              {stat.icon}
              <div>
                <p className="text-xl font-black text-slate-900 leading-none">{stat.value}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Modules */}
        <div className="space-y-4">
          {modules.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-sm">Este programa no tiene módulos todavía.</p>
            </div>
          ) : (
            modules.map((mod: any) => (
              <div key={mod.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-800 text-sm">
                      Módulo {mod.order_index}: {mod.title}
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {mod.lessons.length} {mod.lessons.length === 1 ? 'clase' : 'clases'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {mod.lessons.filter((l: Lesson) => l.status === 'unlocked').length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#00A9CE]/10 text-[#00A9CE]">
                        <IoLockOpenOutline size={9} />
                        {mod.lessons.filter((l: Lesson) => l.status === 'unlocked').length} activa{mod.lessons.filter((l: Lesson) => l.status === 'unlocked').length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {mod.lessons.length === 0 ? (
                    <p className="text-sm text-slate-400 italic py-2 text-center">Sin clases en este módulo</p>
                  ) : (
                    mod.lessons.map((lesson: Lesson) => (
                      <LessonLifecycleForm
                        key={lesson.id}
                        lesson={lesson}
                        courseId={cursoId}
                      />
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
