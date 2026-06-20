import { createClient } from '@/utils/supabase/server';
import { normalizeImageUrl } from '@/src/services/imageUrl';
import { isAdminRole } from '@/src/services/roleService';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IoArrowBackOutline, IoDocumentTextOutline, IoEyeOutline } from 'react-icons/io5';
import CursoContent, { type ModuleNode, type ResourceWithContext } from './CursoContent';

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
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile) notFound();

  const isOrganizer = isAdminRole(profile.role ?? '');

  // NOTA: Por el momento permitimos que CUALQUIER alumno autenticado acceda
  // a los cursos publicados, sin requerir enrollment. El RLS de courses ya
  // garantiza que solo se vean los publicados.
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, cover_image_url, is_published')
    .eq('id', cursoId)
    .eq('is_published', true)
    .maybeSingle();

  if (!course) notFound();

  // Buscamos enrollment opcional para mostrar progreso real si lo tiene.
  const { data: courseCycles } = await supabase
    .from('cycles')
    .select('id')
    .eq('course_id', cursoId);

  const cycleIds = (courseCycles || []).map((c: any) => c.id);

  const { data: enrollment } = cycleIds.length > 0
    ? await supabase
        .from('enrollments')
        .select('id, status')
        .eq('user_id', profile.id)
        .in('cycle_id', cycleIds)
        .in('status', ['active', 'completed'])
        .maybeSingle()
    : { data: null };

  // Fetch modules (ordered) with their lessons
  const { data: rawModules } = await supabase
    .from('modules')
    .select(`
      id, title, order_index, module_type,
      lessons (
        id, title, description, video_url, duration_seconds, order_index, is_published
      )
    `)
    .eq('course_id', cursoId)
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  type RawLesson = {
    id: string;
    title: string;
    description: string | null;
    video_url: string | null;
    duration_seconds: number;
    order_index: number;
    is_published: boolean;
  };

  const allModules: ModuleNode[] = (rawModules || []).map((m: any) => ({
    id: m.id,
    title: m.title,
    order_index: m.order_index,
    module_type: m.module_type ?? 'module',
    lessons: [...(m.lessons || [])]
      .filter((l: RawLesson) => l.is_published)
      .sort((a: RawLesson, b: RawLesson) => a.order_index - b.order_index)
      .map((l: RawLesson) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        video_url: l.video_url,
        duration_seconds: l.duration_seconds,
        order_index: l.order_index,
      })),
  }));

  const modules = allModules.filter((m) => m.module_type === 'module');
  const workshopModules = allModules.filter((m) => m.module_type === 'workshop');
  const institutionalModules = allModules.filter((m) => m.module_type === 'institutional');

  // Lessons that count toward progress = regular modules + workshops (NOT institutional)
  const trackableLessonIds = [...modules, ...workshopModules].flatMap((m) => m.lessons.map((l) => l.id));
  const institutionalLessonIds = institutionalModules.flatMap((m) => m.lessons.map((l) => l.id));

  // Fetch lesson_progress (skip for organizer) — only for trackable lessons.
  const completedSet = new Set<string>();
  if (!isOrganizer && trackableLessonIds.length > 0) {
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', profile.id)
      .in('lesson_id', trackableLessonIds)
      .eq('completed', true);
    (progress || []).forEach((p: any) => completedSet.add(p.lesson_id));
  }

  const totalLessons = trackableLessonIds.length;
  const completedCount = completedSet.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // First incomplete lesson — only across trackable modules.
  let nextLessonId: string | null = null;
  if (!isOrganizer) {
    outer: for (const mod of [...modules, ...workshopModules]) {
      for (const lesson of mod.lessons) {
        if (!completedSet.has(lesson.id)) {
          nextLessonId = lesson.id;
          break outer;
        }
      }
    }
  }
  // Organizer: link to first regular/workshop lesson for easy navigation
  const firstLessonId = modules[0]?.lessons[0]?.id ?? workshopModules[0]?.lessons[0]?.id ?? null;

  // Fetch lesson_resources from INSTITUTIONAL modules only — these power the
  // "Archivos institucionales" tab as a stand-alone document repository.
  const { data: resources } = institutionalLessonIds.length > 0
    ? await supabase
        .from('lesson_resources')
        .select('id, lesson_id, title, file_url, type, created_at')
        .in('lesson_id', institutionalLessonIds)
        .order('created_at', { ascending: true })
    : { data: [] };

  // Build lesson → module index map for institutional resources only.
  const lessonIndex = new Map<string, { lessonTitle: string; lessonOrder: number; moduleId: string; moduleTitle: string; moduleOrder: number }>();
  for (const m of institutionalModules) {
    for (const l of m.lessons) {
      lessonIndex.set(l.id, {
        lessonTitle: l.title,
        lessonOrder: l.order_index,
        moduleId: m.id,
        moduleTitle: m.title,
        moduleOrder: m.order_index,
      });
    }
  }

  const resourcesWithContext: ResourceWithContext[] = (resources || [])
    .map((r: any) => {
      const ctx = lessonIndex.get(r.lesson_id);
      if (!ctx) return null;
      return {
        id: r.id,
        title: r.title,
        file_url: r.file_url,
        type: r.type ?? 'link',
        createdAt: r.created_at,
        lessonId: r.lesson_id,
        lessonTitle: ctx.lessonTitle,
        lessonOrder: ctx.lessonOrder,
        moduleId: ctx.moduleId,
        moduleTitle: ctx.moduleTitle,
        moduleOrder: ctx.moduleOrder,
      };
    })
    .filter((r): r is ResourceWithContext => r !== null)
    .sort((a, b) => {
      if (a.moduleOrder !== b.moduleOrder) return a.moduleOrder - b.moduleOrder;
      if (a.lessonOrder !== b.lessonOrder) return a.lessonOrder - b.lessonOrder;
      return a.createdAt.localeCompare(b.createdAt);
    });

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
          {(() => {
            const coverSrc = normalizeImageUrl(course.cover_image_url, 'w1200');
            return coverSrc ? (
              <>
                <img
                  src={coverSrc}
                  alt={course.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#00A9CE]/80 to-blue-900/80" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#00A9CE] to-blue-700" />
            );
          })()}
          <h1 className="text-3xl font-black text-white relative z-10 leading-tight drop-shadow-md">
            {course.title}
          </h1>
        </div>
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-3">
            {isOrganizer ? (
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-700 flex items-center gap-1">
                <IoEyeOutline size={12} /> Organizando
              </span>
            ) : (
              <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md ${
                enrollment?.status === 'completed' || progressPercent === 100
                  ? 'bg-emerald-100 text-emerald-700'
                  : progressPercent > 0
                  ? 'bg-[#00A9CE]/10 text-[#00A9CE]'
                  : !enrollment
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {enrollment?.status === 'completed' || progressPercent === 100
                  ? 'Completado'
                  : progressPercent > 0
                  ? 'En Curso'
                  : !enrollment
                  ? 'Disponible'
                  : 'Sin iniciar'}
              </span>
            )}
            <span className="text-sm font-medium text-slate-500">
              {totalLessons} {totalLessons === 1 ? 'tema' : 'temas'} · {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
              {workshopModules.length > 0 && ` · ${workshopModules.length} taller${workshopModules.length !== 1 ? 'es' : ''}`}
            </span>
          </div>

          {course.description && (
            <p className="text-slate-600 text-base mb-6 leading-relaxed">{course.description}</p>
          )}

          {isOrganizer ? (
            <p className="text-sm text-amber-600 font-bold flex items-center gap-1.5 mb-4">
              <IoEyeOutline size={14} /> Vista organizador — el progreso de los alumnos no se modifica
            </p>
          ) : (
            <div className="space-y-2 mb-2">
              <div className="flex justify-between text-sm font-bold text-slate-700">
                <span>Progreso General</span>
                <span className="text-[#00A9CE]">{completedCount}/{totalLessons} temas ({progressPercent}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00A9CE] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {isOrganizer ? (
            firstLessonId && (
              <Link
                href={`/cursos/${cursoId}/${firstLessonId}`}
                className="mt-3 self-start px-5 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm"
              >
                Explorar el programa →
              </Link>
            )
          ) : (
            nextLessonId && (
              <Link
                href={`/cursos/${cursoId}/${nextLessonId}`}
                className="mt-3 self-start px-5 py-2.5 bg-[#00A9CE] text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
              >
                {progressPercent === 0 ? 'Comenzar programa →' : 'Continuar donde lo dejé →'}
              </Link>
            )
          )}
        </div>
      </div>

      {totalLessons === 0 && resourcesWithContext.length === 0 ? (
        /* No LMS content yet */
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <IoDocumentTextOutline size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 mb-1">Contenido en preparación</h3>
          <p className="text-sm text-slate-500">Los temas de este programa estarán disponibles pronto.</p>
        </div>
      ) : (
        <CursoContent
          cursoId={cursoId}
          modules={modules}
          workshopModules={workshopModules}
          resources={resourcesWithContext}
          completedLessonIds={Array.from(completedSet)}
          nextLessonId={nextLessonId}
          isOrganizer={isOrganizer}
        />
      )}
    </div>
  );
}
