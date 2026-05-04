import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { IoArrowBackOutline, IoDocumentTextOutline } from 'react-icons/io5';
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
  if (!['admin', 'sysadmin', 'super_admin'].includes(profile?.role ?? '')) redirect('/dashboard');

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

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex items-center gap-4">
          <Link
            href="/admin/lms"
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <IoArrowBackOutline /> Todos los cursos
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
            <p className="text-slate-500 text-sm mt-1">
              Configurá el estado, bloqueos y entregas de cada clase
            </p>
          </div>
          <Link
            href={`/admin/lms/${cursoId}/entregas`}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors"
          >
            <IoDocumentTextOutline size={16} /> Ver Entregas
          </Link>
        </div>

        <div className="space-y-6">
          {modules.map((mod: any) => (
            <div key={mod.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-slate-900">
                  Módulo {mod.order_index}: {mod.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{mod.lessons.length} clases</p>
              </div>

              <div className="p-4 space-y-2">
                {mod.lessons.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-2">Sin clases en este módulo</p>
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
          ))}
        </div>
      </div>
    </div>
  );
}
