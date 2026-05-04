import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  IoArrowBackOutline,
  IoCheckmarkCircle,
  IoPlayCircleOutline,
  IoDocumentTextOutline,
  IoLockClosedOutline,
  IoEllipseOutline,
} from 'react-icons/io5';

function formatDuration(seconds: number) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default async function CursoDetallePage({
  params,
}: {
  params: Promise<{ cursoId: string }>;
}) {
  const { cursoId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) notFound();

  // Verify enrollment: find a cycle with this course_id that the user is enrolled in
  const { data: courseCycles } = await supabase
    .from('cycles')
    .select('id')
    .eq('course_id', cursoId);

  const cycleIds = (courseCycles || []).map((c: any) => c.id);

  if (cycleIds.length === 0) notFound();

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('user_id', profile.id)
    .in('cycle_id', cycleIds)
    .in('status', ['active', 'completed'])
    .maybeSingle();

  if (!enrollment) notFound();

  // Fetch course
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, cover_image_url')
    .eq('id', cursoId)
    .single();

  if (!course) notFound();

  // Fetch modules (ordered) with their lessons
  const { data: rawModules } = await supabase
    .from('modules')
    .select(`
      id, title, order_index,
      lessons (
        id, title, description, video_url, duration_seconds, order_index, is_published
      )
    `)
    .eq('course_id', cursoId)
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  type Lesson = {
    id: string;
    title: string;
    description: string | null;
    video_url: string | null;
    duration_seconds: number;
    order_index: number;
    is_published: boolean;
  };

  type Module = {
    id: string;
    title: string;
    order_index: number;
    lessons: Lesson[];
  };

  const modules: Module[] = (rawModules || []).map((m: any) => ({
    ...m,
    lessons: [...(m.lessons || [])]
      .filter((l: Lesson) => l.is_published)
      .sort((a: Lesson, b: Lesson) => a.order_index - b.order_index),
  }));

  // Fetch lesson_progress
  const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const completedSet = new Set<string>();

  if (allLessonIds.length > 0) {
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', profile.id)
      .in('lesson_id', allLessonIds)
      .eq('completed', true);
    (progress || []).forEach((p: any) => completedSet.add(p.lesson_id));
  }

  const totalLessons = allLessonIds.length;
  const completedCount = completedSet.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Find the first incomplete lesson for the "Continuar" link
  let nextLessonId: string | null = null;
  outer: for (const mod of modules) {
    for (const lesson of mod.lessons) {
      if (!completedSet.has(lesson.id)) {
        nextLessonId = lesson.id;
        break outer;
      }
    }
  }

  // Fetch lesson_resources for all lessons (sidebar material)
  const { data: resources } = await supabase
    .from('lesson_resources')
    .select('id, lesson_id, title, file_url, type')
    .in('lesson_id', allLessonIds.length > 0 ? allLessonIds : ['__none__']);

  const resourcesByLesson: Record<string, { id: string; title: string; file_url: string; type: string }[]> = {};
  (resources || []).forEach((r: any) => {
    if (!resourcesByLesson[r.lesson_id]) resourcesByLesson[r.lesson_id] = [];
    resourcesByLesson[r.lesson_id].push(r);
  });

  const courseResources = Object.values(resourcesByLesson).flat();

  return (
    <div className="space-y-8 pb-12">

      {/* BACK */}
      <div>
        <Link
          href="/cursos"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#00A9CE] transition-colors"
        >
          <IoArrowBackOutline /> Volver a Mis Programas
        </Link>
      </div>

      {/* HERO */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 min-h-[140px] relative overflow-hidden flex items-center justify-center p-8 text-center">
          {course.cover_image_url ? (
            <>
              <img
                src={course.cover_image_url}
                alt={course.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#00A9CE]/80 to-blue-900/80" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#00A9CE] to-blue-700" />
          )}
          <h1 className="text-3xl font-black text-white relative z-10 leading-tight drop-shadow-md">
            {course.title}
          </h1>
        </div>
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md ${
              enrollment.status === 'completed' || progressPercent === 100
                ? 'bg-emerald-100 text-emerald-700'
                : progressPercent > 0
                ? 'bg-[#00A9CE]/10 text-[#00A9CE]'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {enrollment.status === 'completed' || progressPercent === 100
                ? 'Completado'
                : progressPercent > 0
                ? 'En Curso'
                : 'Sin iniciar'}
            </span>
            <span className="text-sm font-medium text-slate-500">
              {totalLessons} {totalLessons === 1 ? 'clase' : 'clases'} · {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
            </span>
          </div>

          {course.description && (
            <p className="text-slate-600 text-base mb-6 leading-relaxed">{course.description}</p>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-700">
              <span>Progreso General</span>
              <span className="text-[#00A9CE]">{completedCount}/{totalLessons} clases ({progressPercent}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00A9CE] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {nextLessonId && (
            <Link
              href={`/cursos/${cursoId}/${nextLessonId}`}
              className="mt-5 self-start px-5 py-2.5 bg-[#00A9CE] text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
            >
              {progressPercent === 0 ? 'Comenzar programa →' : 'Continuar donde lo dejé →'}
            </Link>
          )}
        </div>
      </div>

      {totalLessons === 0 ? (
        /* No LMS content yet */
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <IoDocumentTextOutline size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 mb-1">Contenido en preparación</h3>
          <p className="text-sm text-slate-500">Las clases de este programa estarán disponibles pronto.</p>
        </div>
      ) : (
        /* CONTENT GRID */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">

          {/* MODULE LIST — 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Contenido del Programa</h2>
            <div className="space-y-4">
              {modules.map((mod, modIdx) => {
                const modCompleted = mod.lessons.filter((l) => completedSet.has(l.id)).length;
                const modTotal = mod.lessons.length;
                const isCurrentModule =
                  modCompleted < modTotal &&
                  (modIdx === 0 || modules[modIdx - 1].lessons.every((l) => completedSet.has(l.id)));

                return (
                  <div
                    key={mod.id}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                      isCurrentModule
                        ? 'border-l-4 border-l-[#00A9CE] border-slate-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className={`p-5 border-b flex justify-between items-center ${
                      isCurrentModule ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                          isCurrentModule ? 'text-[#00A9CE]' : 'text-slate-500'
                        }`}>
                          Módulo {mod.order_index}
                          {isCurrentModule && ' (Actual)'}
                        </p>
                        <h3 className="text-lg font-bold text-slate-900">{mod.title}</h3>
                      </div>
                      {modCompleted === modTotal && modTotal > 0 ? (
                        <div className="text-emerald-500 font-bold text-sm flex items-center gap-1">
                          <IoCheckmarkCircle size={20} /> {modTotal}/{modTotal}
                        </div>
                      ) : (
                        <div className={`font-bold text-sm ${isCurrentModule ? 'text-[#00A9CE]' : 'text-slate-500'}`}>
                          {modCompleted}/{modTotal}
                        </div>
                      )}
                    </div>

                    <div className="divide-y divide-slate-100">
                      {mod.lessons.map((lesson) => {
                        const isDone = completedSet.has(lesson.id);
                        const isNext = lesson.id === nextLessonId;

                        return (
                          <Link
                            key={lesson.id}
                            href={`/cursos/${cursoId}/${lesson.id}`}
                            className={`flex items-center justify-between p-4 transition-colors group ${
                              isNext
                                ? 'bg-[#00A9CE]/5 hover:bg-[#00A9CE]/10'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {isDone ? (
                                <IoCheckmarkCircle size={24} className="text-emerald-500 shrink-0" />
                              ) : isNext ? (
                                <div className="w-6 h-6 rounded-full border-2 border-[#00A9CE] flex items-center justify-center shrink-0">
                                  <div className="w-2 h-2 bg-[#00A9CE] rounded-full" />
                                </div>
                              ) : (
                                <IoEllipseOutline size={24} className="text-slate-300 shrink-0" />
                              )}
                              <div>
                                <p className={`text-sm font-bold transition-colors ${
                                  isNext
                                    ? 'text-[#00A9CE]'
                                    : isDone
                                    ? 'text-slate-700 group-hover:text-[#00A9CE]'
                                    : 'text-slate-900 group-hover:text-[#00A9CE]'
                                }`}>
                                  {lesson.order_index}. {lesson.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                  <IoPlayCircleOutline className="inline" />
                                  Video
                                  {lesson.duration_seconds > 0 && ` · ${formatDuration(lesson.duration_seconds)}`}
                                </p>
                              </div>
                            </div>
                            {isNext && (
                              <span className="text-xs font-bold bg-white text-[#00A9CE] px-2 py-1 rounded shadow-sm border border-[#00A9CE]/20 shrink-0">
                                Continuar
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SIDEBAR — 1 col */}
          <div className="space-y-6">
            {courseResources.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <IoDocumentTextOutline className="text-[#00A9CE] text-xl" />
                  Material del Curso
                </h3>
                <ul className="space-y-3">
                  {courseResources.map((r) => (
                    <li key={r.id}>
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 group"
                      >
                        <div className={`p-2 rounded-lg transition-colors ${
                          r.type === 'pdf'
                            ? 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white'
                            : 'bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'
                        }`}>
                          <IoDocumentTextOutline size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 group-hover:text-[#00A9CE] transition-colors">
                            {r.title}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">{r.type}</p>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Progress card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">Tu Progreso</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Clases completadas</span>
                  <span className="font-bold">{completedCount}/{totalLessons}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-right text-xs text-slate-400 font-medium">{progressPercent}% completado</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
