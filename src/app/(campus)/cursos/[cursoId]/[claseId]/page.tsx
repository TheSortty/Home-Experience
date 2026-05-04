import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  IoArrowBackOutline,
  IoCheckmarkCircle,
  IoEllipseOutline,
  IoChevronForwardOutline,
  IoLockClosedOutline,
} from 'react-icons/io5';
import LessonViewer, { type LessonResource } from './LessonViewer';
import type { LessonPost } from './LessonForum';
import type { SubmissionData } from './SubmissionTab';

function formatDuration(seconds: number) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getYoutubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (!match) return null;
  return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
}

function formatUnlockDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default async function ClaseDetallePage({
  params,
}: {
  params: Promise<{ cursoId: string; claseId: string }>;
}) {
  const { cursoId, claseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) notFound();

  // Verify enrollment
  const { data: courseCycles } = await supabase
    .from('cycles')
    .select('id')
    .eq('course_id', cursoId);

  const cycleIds = (courseCycles || []).map((c: any) => c.id);
  if (cycleIds.length === 0) notFound();

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', profile.id)
    .in('cycle_id', cycleIds)
    .in('status', ['active', 'completed'])
    .maybeSingle();

  if (!enrollment) notFound();

  // Fetch the lesson (include lifecycle columns)
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, description, video_url, duration_seconds, order_index, module_id, status, unlock_at, unlocked_at, due_days_after_unlock, requires_submission')
    .eq('id', claseId)
    .single();

  if (!lesson) notFound();

  // Fetch the module
  const { data: module } = await supabase
    .from('modules')
    .select('id, title, course_id, order_index')
    .eq('id', lesson.module_id)
    .single();

  if (!module || module.course_id !== cursoId) notFound();

  // Fetch course title
  const { data: course } = await supabase
    .from('courses')
    .select('id, title')
    .eq('id', cursoId)
    .single();

  // Fetch ALL published modules + lessons for the sidebar
  const { data: rawModules } = await supabase
    .from('modules')
    .select(`
      id, title, order_index,
      lessons (
        id, title, duration_seconds, order_index, is_published, status
      )
    `)
    .eq('course_id', cursoId)
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  type SidebarLesson = {
    id: string;
    title: string;
    duration_seconds: number;
    order_index: number;
    is_published: boolean;
    status: string;
  };

  type SidebarModule = {
    id: string;
    title: string;
    order_index: number;
    lessons: SidebarLesson[];
  };

  const allModules: SidebarModule[] = (rawModules || []).map((m: any) => ({
    ...m,
    lessons: [...(m.lessons || [])]
      .filter((l: SidebarLesson) => l.is_published)
      .sort((a: SidebarLesson, b: SidebarLesson) => a.order_index - b.order_index),
  }));

  // Only unlocked lessons count toward progress
  const unlockedLessonIds = allModules
    .flatMap((m) => m.lessons)
    .filter((l) => l.status === 'unlocked')
    .map((l) => l.id);

  const allLessonIds = allModules.flatMap((m) => m.lessons.map((l) => l.id));
  const totalLessons = unlockedLessonIds.length;

  // Fetch progress
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

  const completedCount = [...completedSet].filter((id) => unlockedLessonIds.includes(id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const isCurrentLessonCompleted = completedSet.has(claseId);

  // Determine next unlocked lesson
  let nextLessonId: string | null = null;
  let foundCurrent = false;
  outer: for (const mod of allModules) {
    for (const l of mod.lessons) {
      if (foundCurrent && l.status === 'unlocked') { nextLessonId = l.id; break outer; }
      if (l.id === claseId) foundCurrent = true;
    }
  }

  // Fetch resources for this lesson
  const { data: rawResources } = await supabase
    .from('lesson_resources')
    .select('id, title, file_url, type')
    .eq('lesson_id', claseId);

  const resources: LessonResource[] = rawResources || [];
  const embedUrl = getYoutubeEmbedUrl(lesson.video_url);

  // Fetch forum posts
  const { data: rawPosts } = await supabase
    .from('forum_posts')
    .select('id, user_id, title, body, parent_id, created_at, profiles(first_name, last_name)')
    .eq('course_id', cursoId)
    .eq('lesson_id', claseId)
    .order('created_at', { ascending: true });

  type FlatPost = LessonPost & { parent_id: string | null };
  const flat: FlatPost[] = (rawPosts || []).map((p: any) => {
    const firstName = p.profiles?.first_name ?? '';
    const lastName = p.profiles?.last_name ?? '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Estudiante';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
    return {
      id: p.id,
      user_id: p.user_id,
      title: p.title,
      body: p.body,
      created_at: p.created_at,
      author_name: fullName,
      author_initials: initials,
      is_own: p.user_id === profile.id,
      parent_id: p.parent_id,
      replies: [],
    };
  });

  const postMap: Record<string, LessonPost> = {};
  flat.forEach((p) => { postMap[p.id] = p; });
  const lessonPosts: LessonPost[] = [];
  flat.forEach((p) => {
    if (p.parent_id && postMap[p.parent_id]) postMap[p.parent_id].replies.push(p);
    else if (!p.parent_id) lessonPosts.push(p);
  });
  lessonPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Get current user's name
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', profile.id)
    .single();
  const currentUserName = currentProfile
    ? `${currentProfile.first_name ?? ''} ${currentProfile.last_name ?? ''}`.trim() || 'Alumno'
    : 'Alumno';

  // ── Submission data ────────────────────────────────────────────────────────

  let submissionData: SubmissionData = {
    requiresSubmission: lesson.requires_submission ?? false,
    dueDate: null,
    isOverdue: false,
    daysRemaining: null,
    latestSubmission: null,
    latestReview: null,
  };

  if (lesson.requires_submission) {
    const nowMs = Date.now();

    if (lesson.unlocked_at && lesson.due_days_after_unlock) {
      const dueMs = new Date(lesson.unlocked_at).getTime() + lesson.due_days_after_unlock * 86400000;
      submissionData.dueDate = new Date(dueMs).toISOString();
      submissionData.isOverdue = nowMs > dueMs;
      submissionData.daysRemaining = submissionData.isOverdue
        ? null
        : Math.ceil((dueMs - nowMs) / 86400000);
    }

    const { data: latestSubs } = await supabase
      .from('submissions')
      .select('id, file_name, submitted_at, is_late, version')
      .eq('user_id', profile.id)
      .eq('lesson_id', claseId)
      .order('version', { ascending: false })
      .limit(1);

    if (latestSubs?.length) {
      const sub = latestSubs[0];
      submissionData.latestSubmission = sub;

      const { data: reviews } = await supabase
        .from('submission_reviews')
        .select('feedback_text, revised_storage_path, revised_file_name, reviewed_at, submission_id')
        .eq('submission_id', sub.id)
        .order('reviewed_at', { ascending: false })
        .limit(1);

      if (reviews?.length) submissionData.latestReview = reviews[0];
    }
  }

  // ── Locked gate ───────────────────────────────────────────────────────────

  const isLocked = lesson.status === 'scheduled';

  return (
    <div className="pb-12">

      {/* BREADCRUMBS */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 flex-wrap">
          <Link href="/cursos" className="hover:text-[#00A9CE] transition-colors">
            Mis Programas
          </Link>
          <IoChevronForwardOutline size={14} />
          <Link href={`/cursos/${cursoId}`} className="hover:text-[#00A9CE] transition-colors">
            {course?.title ?? 'Programa'}
          </Link>
          <IoChevronForwardOutline size={14} />
          <span className="text-slate-900 font-bold line-clamp-1">{lesson.title}</span>
        </div>
        <Link
          href={`/cursos/${cursoId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#00A9CE] transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 shrink-0"
        >
          <IoArrowBackOutline /> Volver al Temario
        </Link>
      </div>

      {/* LOCKED STATE */}
      {isLocked ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <div className="bg-slate-900 rounded-2xl aspect-video flex items-center justify-center text-white/60">
              <div className="text-center px-8">
                <IoLockClosedOutline size={64} className="mx-auto mb-4 opacity-40" />
                <h2 className="text-xl font-bold text-white mb-2">Clase bloqueada</h2>
                {lesson.unlock_at ? (
                  <p className="text-sm text-white/60">
                    Se libera el <strong className="text-white/80">{formatUnlockDate(lesson.unlock_at)}</strong>
                  </p>
                ) : (
                  <p className="text-sm text-white/60">
                    Esta clase se desbloqueará pronto.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <p className="text-slate-500 text-sm">
                El contenido de esta clase todavía no está disponible.
                {lesson.unlock_at && ` Volvé el ${formatUnlockDate(lesson.unlock_at)}.`}
              </p>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="xl:col-span-1">
            <CourseSidebar
              allModules={allModules}
              completedSet={completedSet}
              claseId={claseId}
              cursoId={cursoId}
              progressPercent={progressPercent}
              completedCount={completedCount}
              totalLessons={totalLessons}
              nextLessonId={nextLessonId}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* MAIN COLUMN */}
          <div className="xl:col-span-2 space-y-6">
            <LessonViewer
              lessonId={claseId}
              courseId={cursoId}
              lessonTitle={lesson.title}
              lessonIndex={lesson.order_index}
              moduleTitle={module.title}
              durationLabel={formatDuration(lesson.duration_seconds)}
              description={lesson.description}
              initialCompleted={isCurrentLessonCompleted}
              resources={resources}
              initialPosts={lessonPosts}
              currentUserName={currentUserName}
              embedUrl={embedUrl}
              submissionData={submissionData}
            />
          </div>

          {/* SIDEBAR */}
          <div className="xl:col-span-1">
            <CourseSidebar
              allModules={allModules}
              completedSet={completedSet}
              claseId={claseId}
              cursoId={cursoId}
              progressPercent={progressPercent}
              completedCount={completedCount}
              totalLessons={totalLessons}
              nextLessonId={nextLessonId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar sub-component ─────────────────────────────────────────────────────

function CourseSidebar({
  allModules, completedSet, claseId, cursoId,
  progressPercent, completedCount, totalLessons, nextLessonId,
}: {
  allModules: { id: string; title: string; lessons: { id: string; title: string; duration_seconds: number; order_index: number; status: string }[] }[];
  completedSet: Set<string>;
  claseId: string;
  cursoId: string;
  progressPercent: number;
  completedCount: number;
  totalLessons: number;
  nextLessonId: string | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
      <div className="p-5 border-b border-slate-200 bg-slate-50">
        <h3 className="font-bold text-slate-900">Contenido del Curso</h3>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Progreso: {progressPercent}%</span>
            <span>{completedCount}/{totalLessons} Clases</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
        {allModules.map((mod) => {
          const modCompleted = mod.lessons.filter((l) => completedSet.has(l.id) && l.status === 'unlocked').length;
          const modTotal = mod.lessons.filter((l) => l.status === 'unlocked').length;
          return (
            <div key={mod.id} className="border-b border-slate-100 last:border-0">
              <div className="px-5 py-3 bg-slate-50/50 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {mod.title}
                </span>
                {modTotal > 0 && modCompleted === modTotal ? (
                  <IoCheckmarkCircle className="text-emerald-500" size={16} />
                ) : (
                  <span className="text-xs text-slate-400">{modCompleted}/{modTotal}</span>
                )}
              </div>

              <div className="divide-y divide-slate-50">
                {mod.lessons.map((l) => {
                  const isDone = completedSet.has(l.id);
                  const isCurrent = l.id === claseId;
                  const isLocked = l.status === 'scheduled';

                  return isLocked ? (
                    <div
                      key={l.id}
                      className="flex items-start gap-3 p-4 opacity-50"
                    >
                      <IoLockClosedOutline size={18} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          {l.order_index}. {l.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Próximamente</p>
                      </div>
                    </div>
                  ) : (
                    <Link
                      key={l.id}
                      href={`/cursos/${cursoId}/${l.id}`}
                      className={`flex items-start gap-3 p-4 transition-colors ${
                        isCurrent
                          ? 'bg-[#00A9CE]/5 cursor-default pointer-events-none'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {isCurrent ? (
                        <div className="relative shrink-0 mt-0.5">
                          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[#00A9CE]" />
                          {isDone ? (
                            <IoCheckmarkCircle size={20} className="text-emerald-500 ml-1 z-10 relative" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-[#00A9CE] flex items-center justify-center ml-1 z-10 relative bg-white">
                              <div className="w-2 h-2 bg-[#00A9CE] rounded-full" />
                            </div>
                          )}
                        </div>
                      ) : isDone ? (
                        <IoCheckmarkCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <IoEllipseOutline size={20} className="text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${
                          isCurrent
                            ? isDone ? 'text-slate-900' : 'text-[#00A9CE] font-bold'
                            : 'text-slate-900'
                        }`}>
                          {l.order_index}. {l.title}
                        </p>
                        {l.duration_seconds > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            {formatDuration(l.duration_seconds)}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {nextLessonId && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <Link
            href={`/cursos/${cursoId}/${nextLessonId}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#00A9CE] text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
          >
            Siguiente clase <IoChevronForwardOutline />
          </Link>
        </div>
      )}
    </div>
  );
}
