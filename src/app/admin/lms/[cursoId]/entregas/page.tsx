import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  IoArrowBackOutline, IoTimeOutline, IoDocumentTextOutline,
  IoCheckmarkCircle, IoAlertCircleOutline,
} from 'react-icons/io5';
import { isAdminRole } from '@/src/services/roleService';
import SubmissionCard from './SubmissionCard';

export default async function EntregasPage({
  params,
  searchParams,
}: {
  params: Promise<{ cursoId: string }>;
  searchParams: Promise<{ lesson?: string; team?: string; status?: string }>;
}) {
  const { cursoId } = await params;
  const { lesson: filterLesson, team = 'all', status: statusFilter = 'all' } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  const isCoach = profile?.role === 'coach';
  const isAdmin = isAdminRole(profile?.role ?? '');
  if (!isCoach && !isAdmin) redirect('/dashboard');

  const { data: course } = await supabase
    .from('courses').select('id, title').eq('id', cursoId).single();
  if (!course) notFound();

  // ── Lessons with submissions ───────────────────────────────────────────────

  const { data: lessonsWithSubmission } = await supabase
    .from('lessons')
    .select('id, title, order_index, unlocked_at, due_days_after_unlock, modules(title, order_index, course_id)')
    .eq('requires_submission', true)
    .eq('is_published', true);

  const lessonList = ((lessonsWithSubmission || []) as any[])
    .filter((l: any) => l.modules?.course_id === cursoId)
    .sort((a: any, b: any) => {
      const modDiff = (a.modules?.order_index ?? 0) - (b.modules?.order_index ?? 0);
      return modDiff !== 0 ? modDiff : a.order_index - b.order_index;
    });

  const activeLessonId = filterLesson ?? lessonList[0]?.id;

  // ── Coach assigned students ───────────────────────────────────────────────

  let assignedStudentIds = new Set<string>();
  if (profile?.id) {
    const { data: assignments } = await supabase
      .from('coach_assignments')
      .select('student_profile_id')
      .eq('coach_profile_id', profile.id);
    assignedStudentIds = new Set((assignments || []).map((a: any) => a.student_profile_id));
  }

  // ── Pending count per lesson (for the sidebar badges) ─────────────────────
  // Without this, a coach landing on the first lesson can't tell which other
  // lessons have submissions waiting — they'd have to click through each one.
  const pendingByLesson: Record<string, number> = {};
  {
    const lessonIds = lessonList.map((l: any) => l.id);
    if (lessonIds.length > 0) {
      const { data: allSubs } = await supabase
        .from('submissions')
        .select('user_id, lesson_id, version, status')
        .in('lesson_id', lessonIds);

      // Keep only the latest version per (student, lesson) — that row's status
      // is what determines whether the delivery is still pending.
      const latestByKey: Record<string, any> = {};
      for (const s of allSubs || []) {
        const key = `${s.lesson_id}::${s.user_id}`;
        if (!latestByKey[key] || s.version > latestByKey[key].version) latestByKey[key] = s;
      }
      const countTeam = team === 'mine';
      for (const s of Object.values(latestByKey) as any[]) {
        if (s.status !== 'pending_review') continue;
        if (countTeam && !assignedStudentIds.has(s.user_id)) continue;
        pendingByLesson[s.lesson_id] = (pendingByLesson[s.lesson_id] ?? 0) + 1;
      }
    }
  }

  // ── Submissions for active lesson ─────────────────────────────────────────

  let submissions: any[] = [];
  let activeLesson: any = null;
  let dueDate: Date | null = null;

  if (activeLessonId) {
    activeLesson = lessonList.find((l: any) => l.id === activeLessonId);

    if (activeLesson?.unlocked_at && activeLesson?.due_days_after_unlock) {
      dueDate = new Date(
        new Date(activeLesson.unlocked_at).getTime() +
        activeLesson.due_days_after_unlock * 86400000
      );
    }

    const { data: subs } = await supabase
      .from('submissions')
      .select(`
        id, file_name, storage_path, submission_url, submitted_at, is_late, version, status, user_id, allow_additional,
        profiles!user_id (id, first_name, last_name, email),
        submission_files (
          id, submission_id, storage_key, file_name, content_type, size_bytes, created_at, is_additional, is_late
        ),
        submission_reviews (
          id, feedback_text, revised_file_name, revised_storage_path, reviewed_at,
          submission_review_files ( id, storage_key, file_name, content_type )
        )
      `)
      .eq('lesson_id', activeLessonId)
      .order('submitted_at', { ascending: false });

    // Keep only latest version per student
    const byUser: Record<string, any> = {};
    for (const sub of subs || []) {
      const uid = sub.user_id;
      if (!byUser[uid] || sub.version > byUser[uid].version) {
        byUser[uid] = sub;
      }
    }
    submissions = Object.values(byUser).sort((a, b) => {
      const aName = `${a.profiles?.last_name ?? ''} ${a.profiles?.first_name ?? ''}`;
      const bName = `${b.profiles?.last_name ?? ''} ${b.profiles?.first_name ?? ''}`;
      return aName.localeCompare(bName);
    });
  }

  // Apply team filter first
  const showTeam = team === 'mine';
  const teamFiltered = showTeam
    ? submissions.filter(s => assignedStudentIds.has(s.profiles?.id))
    : submissions;

  // Status counts (on team-filtered list)
  const countByStatus = {
    all:            teamFiltered.length,
    pending_review: teamFiltered.filter(s => s.status === 'pending_review').length,
    reviewed:       teamFiltered.filter(s => s.status === 'reviewed').length,
    approved:       teamFiltered.filter(s => s.status === 'approved').length,
  };

  // Apply status filter
  const filteredSubmissions = statusFilter === 'all'
    ? teamFiltered
    : teamFiltered.filter(s => s.status === statusFilter);

  const myTeamCount = submissions.filter(s => assignedStudentIds.has(s.profiles?.id)).length;

  // Global pending summary across every lesson of this course.
  const totalPending = Object.values(pendingByLesson).reduce((a, b) => a + b, 0);
  const firstPendingLessonId = lessonList.find((l: any) => (pendingByLesson[l.id] ?? 0) > 0)?.id;

  const backHref = isAdmin ? `/admin/lms/${cursoId}` : `/admin/lms`;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky top bar ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center gap-4">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            <IoArrowBackOutline size={16} />
            <span className="hidden sm:inline">Volver al curso</span>
            <span className="sm:hidden">Volver</span>
          </Link>

          <div className="w-px h-5 bg-slate-200 shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 truncate">{course.title}</p>
            <p className="text-sm font-bold text-slate-900 leading-tight">Entregas</p>
          </div>

          {/* Team filter */}
          {assignedStudentIds.size > 0 && (
            <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
              <Link
                href={`?lesson=${activeLessonId}&team=all`}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  !showTeam ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Todos
              </Link>
              <Link
                href={`?lesson=${activeLessonId}&team=mine`}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  showTeam ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Mi equipo {myTeamCount > 0 && <span className="ml-1 text-[10px]">({myTeamCount})</span>}
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Global pending summary */}
        {totalPending > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-400 text-white font-black text-sm shrink-0">
              {totalPending}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900 leading-tight">
                {totalPending} entrega{totalPending !== 1 ? 's' : ''} esperando devolución
                {team === 'mine' ? ' en tu equipo' : ''}
              </p>
              <p className="text-xs text-amber-700">En todas las clases de este curso.</p>
            </div>
            {firstPendingLessonId && firstPendingLessonId !== activeLessonId && (
              <Link
                href={`?lesson=${firstPendingLessonId}&team=${team}&status=pending_review`}
                className="shrink-0 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
              >
                Ir a la primera →
              </Link>
            )}
          </div>
        )}

        {lessonList.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-14 text-center space-y-3">
            <IoDocumentTextOutline size={36} className="mx-auto text-slate-300" />
            <p className="text-slate-500 text-sm font-medium">Ninguna clase tiene entregas activadas.</p>
            {isAdmin && (
              <Link
                href={`/admin/lms/${cursoId}`}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#00A9CE] hover:text-blue-700"
              >
                <IoArrowBackOutline size={14} /> Activar entregas en las clases
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">

            {/* ── Lesson selector: tabs on mobile, sidebar on desktop ── */}
            {/* Mobile: horizontal scroll tabs */}
            <div className="lg:hidden -mx-4 px-4 overflow-x-auto pb-1">
              <div className="flex gap-2 w-max">
                {lessonList.map((l: any) => {
                  const isActive = l.id === activeLessonId;
                  const pending = pendingByLesson[l.id] ?? 0;
                  return (
                    <Link
                      key={l.id}
                      href={`?lesson=${l.id}&team=${team}&status=${statusFilter}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {l.modules?.order_index}.{l.order_index} {l.title}
                      {pending > 0 && (
                        <span className="bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          {pending}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Desktop: sticky sidebar */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit sticky top-[72px]">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clases con entrega</p>
              </div>
              <div className="p-2 space-y-0.5">
                {lessonList.map((l: any) => {
                  const isActive = l.id === activeLessonId;
                  const pending = pendingByLesson[l.id] ?? 0;
                  return (
                    <Link
                      key={l.id}
                      href={`?lesson=${l.id}&team=${team}&status=${statusFilter}`}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate leading-snug">
                        {l.modules?.order_index}.{l.order_index} {l.title}
                      </span>
                      {pending > 0 && (
                        <span className={`ml-2 shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-amber-400 text-white' : 'bg-amber-400 text-white'}`}>
                          {pending}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* ── Submission list ── */}
            <div className="space-y-4 min-w-0">

              {/* Active lesson header + status filters */}
              {activeLessonId && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 leading-tight">{activeLesson?.title}</h2>
                    {dueDate && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <IoTimeOutline size={12} />
                        Vence {dueDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { id: 'all',            label: 'Todas',       icon: null },
                      { id: 'pending_review', label: 'Pendientes',  icon: <IoAlertCircleOutline size={11} /> },
                      { id: 'reviewed',       label: 'Devueltas',   icon: null },
                      { id: 'approved',       label: 'Aprobadas',   icon: <IoCheckmarkCircle size={11} /> },
                    ] as const).map(tab => {
                      const count = countByStatus[tab.id as keyof typeof countByStatus];
                      const isActive = statusFilter === tab.id;
                      const activeColors: Record<string, string> = {
                        all: 'bg-slate-900 text-white border-slate-900',
                        pending_review: 'bg-amber-500 text-white border-amber-500',
                        reviewed: 'bg-[#00A9CE] text-white border-[#00A9CE]',
                        approved: 'bg-emerald-600 text-white border-emerald-600',
                      };
                      return (
                        <Link
                          key={tab.id}
                          href={`?lesson=${activeLessonId}&team=${team}&status=${tab.id}`}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isActive
                              ? activeColors[tab.id]
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                          }`}
                        >
                          {tab.icon}
                          {tab.label}
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {count}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredSubmissions.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                  <p className="text-slate-400 text-sm italic">
                    {showTeam
                      ? 'Ningún alumno de tu equipo entregó todavía.'
                      : 'Todavía no hay entregas para esta clase.'}
                  </p>
                </div>
              ) : (
                [...filteredSubmissions]
                  .sort((a, b) => {
                    const order = { pending_review: 0, reviewed: 1, approved: 2 };
                    return (order[a.status as keyof typeof order] ?? 1) - (order[b.status as keyof typeof order] ?? 1);
                  })
                  .map((sub) => {
                    const latestReview = [...(sub.submission_reviews || [])]
                      .sort((a: any, b: any) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime())[0] ?? null;
                    const p = sub.profiles as any;
                    const firstName = p?.first_name ?? '';
                    const lastName = p?.last_name ?? '';
                    const studentName = `${firstName} ${lastName}`.trim() || 'Alumno';
                    const studentProfileId = p?.id ?? sub.user_id;

                    return (
                      <SubmissionCard
                        key={sub.id}
                        studentProfileId={studentProfileId}
                        studentName={studentName}
                        studentEmail={p?.email ?? ''}
                        latestSubmission={{
                          id: sub.id,
                          file_name: sub.file_name,
                          storage_path: sub.storage_path,
                          submission_url: sub.submission_url ?? null,
                          submitted_at: sub.submitted_at,
                          is_late: sub.is_late,
                          version: sub.version,
                          status: sub.status ?? 'pending_review',
                          user_id: sub.user_id,
                          allow_additional: sub.allow_additional ?? false,
                          files: (sub.submission_files ?? []).slice().sort(
                            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                          ),
                        }}
                        latestReview={latestReview}
                        courseId={cursoId}
                        lessonId={activeLessonId!}
                        reviewerProfileId={profile?.id ?? ''}
                        isMyTeam={assignedStudentIds.has(studentProfileId)}
                        isAdmin={isAdmin}
                      />
                    );
                  })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
