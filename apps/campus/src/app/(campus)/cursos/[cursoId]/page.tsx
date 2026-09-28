import { createClient, getSessionUser } from '@home/services/supabase/server';
import { normalizeImageUrl } from '@home/services/imageUrl';
import { isAdminRole } from '@home/services/roleService';
import { lessonDueMs } from '@home/services/lessonDeadline';
import { resolveCourseAccess, resolveCampusRole } from '@home/services/courseAccess';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IoArrowBackOutline, IoArrowForwardOutline, IoDocumentTextOutline, IoEyeOutline } from 'react-icons/io5';
import CursoContent, { type CampoClass, type ModuleNode, type ResourceWithContext } from './CursoContent';
import CursoBloqueado from './CursoBloqueado';
import { HeroCielo } from './ProgramaIlustraciones';

export default async function CursoDetallePage({
  params,
}: {
  params: Promise<{ cursoId: string }>;
}) {
  const { cursoId } = await params;
  const supabase = await createClient();

  const user = await getSessionUser(supabase);
  if (!user) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile) notFound();

  // Rol con el que el campus trata a la persona (un admin que cursa = alumno).
  const campusRole = await resolveCampusRole(supabase, user.id, profile.role);
  const isOrganizer = isAdminRole(campusRole ?? '');

  // El curso en sí se puede mirar aunque no lo tengas (vidriera). El contenido
  // no: más abajo cortamos si no hay acceso, y el RLS lo respalda.
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, cover_image_url, is_published')
    .eq('id', cursoId)
    .eq('is_published', true)
    .maybeSingle();

  if (!course) notFound();

  // ── Control de acceso ──────────────────────────────────────────────────────
  // Sin el curso asignado (course_access), el alumno ve la vidriera en vez del
  // contenido. Staff y coaches pasan siempre.
  const access = await resolveCourseAccess(supabase, profile.id, campusRole);
  if (!access.can(cursoId)) {
    return <CursoBloqueado course={course} />;
  }

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
        id, title, description, video_url, duration_seconds, order_index, is_published,
        status, requires_submission, due_at, due_days_after_unlock, unlock_at, unlocked_at
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
    status: string | null;
    requires_submission: boolean | null;
    due_at: string | null;
    due_days_after_unlock: number | null;
    unlock_at: string | null;
    unlocked_at: string | null;
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
        requires_submission: !!l.requires_submission,
      })),
  }));

  const modules = allModules.filter((m) => m.module_type === 'module');
  const workshopModules = allModules.filter((m) => m.module_type === 'workshop');
  const campoModules = allModules.filter((m) => m.module_type === 'campo');
  const institutionalModules = allModules.filter((m) => m.module_type === 'institutional');

  // ── CAMPO: clases sueltas (no módulos) ─────────────────────────────────────
  // El alumno ve cada clase de CAMPO como una tarjeta independiente donde sube
  // su cuaderno de campo. En la base siguen viviendo dentro de un contenedor
  // module_type='campo', pero acá las aplanamos en una sola lista ordenada.
  const rawCampoLessons = (rawModules || [])
    .filter((m: any) => (m.module_type ?? 'module') === 'campo')
    .flatMap((m: any) =>
      ((m.lessons || []) as RawLesson[])
        .filter((l) => l.is_published)
        .map((l) => ({ lesson: l, moduleOrder: m.order_index as number }))
    )
    .sort((a, b) =>
      a.moduleOrder !== b.moduleOrder
        ? a.moduleOrder - b.moduleOrder
        : a.lesson.order_index - b.lesson.order_index
    );

  // Última entrega del alumno por clase de CAMPO (para el estado de la tarjeta).
  const campoLessonIds = rawCampoLessons.map((c) => c.lesson.id);
  const latestSubmissionByLesson = new Map<string, { status: string; version: number }>();
  if (!isOrganizer && campoLessonIds.length > 0) {
    const { data: subs } = await supabase
      .from('submissions')
      .select('lesson_id, status, version')
      .eq('user_id', profile.id)
      .in('lesson_id', campoLessonIds)
      .order('version', { ascending: true });
    (subs || []).forEach((s: any) => {
      latestSubmissionByLesson.set(s.lesson_id, { status: s.status, version: s.version });
    });
  }

  const campoClasses: CampoClass[] = rawCampoLessons.map(({ lesson: l }, idx) => {
    const requiresSubmission = l.requires_submission ?? true;
    const dueMs = lessonDueMs(l);
    const sub = latestSubmissionByLesson.get(l.id);
    return {
      id: l.id,
      title: l.title,
      description: l.description,
      index: idx + 1,
      requiresSubmission,
      dueAt: dueMs !== null ? new Date(dueMs).toISOString() : null,
      isLocked: l.status === 'scheduled',
      submissionStatus: (sub?.status as CampoClass['submissionStatus']) ?? null,
      submittedVersions: sub?.version ?? 0,
      isCompleted: false, // se completa más abajo con lesson_progress
    };
  });

  // Lessons that count toward progress = regular modules + workshops + campo (NOT institutional)
  const trackableLessonIds = [...modules, ...workshopModules, ...campoModules].flatMap((m) => m.lessons.map((l) => l.id));
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

  for (const c of campoClasses) c.isCompleted = completedSet.has(c.id);

  const totalLessons = trackableLessonIds.length;
  const completedCount = completedSet.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // First incomplete lesson — only across trackable modules.
  let nextLessonId: string | null = null;
  if (!isOrganizer) {
    outer: for (const mod of [...modules, ...workshopModules, ...campoModules]) {
      for (const lesson of mod.lessons) {
        if (!completedSet.has(lesson.id)) {
          nextLessonId = lesson.id;
          break outer;
        }
      }
    }
  }
  // Organizer: link to first regular/workshop lesson for easy navigation
  const firstLessonId = modules[0]?.lessons[0]?.id ?? workshopModules[0]?.lessons[0]?.id ?? campoModules[0]?.lessons[0]?.id ?? null;

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
    <div className="space-y-8 pb-12 max-w-[1440px] mx-auto">

      {/* BACK */}
      <div>
        <Link
          href="/cursos"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#00A9CE] transition-colors"
        >
          <IoArrowBackOutline /> Volver a Mis Programas
        </Link>
      </div>

      {/* HERO: panel azul con estrellas (o la tapa del curso) + datos */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        <div className="relative md:w-[431px] shrink-0 min-h-[200px] md:min-h-[290px] bg-[#14567F] overflow-hidden">
          {(() => {
            const coverSrc = normalizeImageUrl(course.cover_image_url, 'w1200');
            return coverSrc ? (
              <>
                <img
                  src={coverSrc}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B3A57] via-[#14567F]/80 to-[#14567F]/50" />
              </>
            ) : null;
          })()}
          <HeroCielo />
          <h1 className="absolute left-8 right-8 md:left-[38px] md:right-[38px] bottom-8 md:bottom-11 text-[28px] md:text-[32px] font-extrabold leading-[1.12] tracking-[-0.01em] text-white">
            {course.title}
          </h1>
        </div>
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            {isOrganizer ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.06em] rounded-lg bg-amber-100 text-amber-800">
                <IoEyeOutline size={14} /> Organizando
              </span>
            ) : (
              <span className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.06em] rounded-lg ${
                enrollment?.status === 'completed' || progressPercent === 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : progressPercent > 0
                  ? 'bg-cyan-100 text-cyan-800'
                  : !enrollment
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {enrollment?.status === 'completed' || progressPercent === 100
                  ? 'Completado'
                  : progressPercent > 0
                  ? 'En curso'
                  : !enrollment
                  ? 'Disponible'
                  : 'Sin iniciar'}
              </span>
            )}
            <span className="text-sm text-slate-600">
              {totalLessons} {totalLessons === 1 ? 'tema' : 'temas'} · {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
              {workshopModules.length > 0 && ` · ${workshopModules.length} taller${workshopModules.length !== 1 ? 'es' : ''}`}
            </span>
          </div>

          {course.description && (
            <p className="text-base leading-[1.65] text-slate-600 max-w-[780px]">{course.description}</p>
          )}

          {isOrganizer ? (
            <p className="flex items-center gap-2 text-sm font-bold text-amber-700">
              <IoEyeOutline size={15} /> Vista organizador — el progreso de los alumnos no se modifica
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold text-slate-700">
                <span>Progreso general</span>
                <span className="text-cyan-700">{completedCount}/{totalLessons} temas ({progressPercent}%)</span>
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
                className="self-start flex items-center gap-2 min-h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-900 text-slate-50 text-sm font-bold transition-colors"
              >
                Explorar el programa <IoArrowForwardOutline size={16} />
              </Link>
            )
          ) : (
            nextLessonId && (
              <Link
                href={`/cursos/${cursoId}/${nextLessonId}`}
                className="self-start flex items-center gap-2 min-h-11 px-5 rounded-xl bg-[#0A7C97] hover:bg-[#08677E] text-white text-sm font-bold transition-colors"
              >
                {progressPercent === 0 ? 'Comenzar programa' : 'Continuar donde lo dejé'} <IoArrowForwardOutline size={16} />
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
          campoClasses={campoClasses}
          resources={resourcesWithContext}
          completedLessonIds={Array.from(completedSet)}
          nextLessonId={nextLessonId}
          isOrganizer={isOrganizer}
        />
      )}
    </div>
  );
}
