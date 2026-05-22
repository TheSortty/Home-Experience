import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { IoArrowBackOutline, IoTimeOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { isAdminRole } from '@/src/services/roleService';
import DownloadButton from './DownloadButton';
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
        id, file_name, storage_path, submitted_at, is_late, version, status, user_id,
        profiles (id, first_name, last_name, email),
        submission_reviews (
          id, feedback_text, revised_file_name, revised_storage_path, reviewed_at
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
  const pendingCount = countByStatus.pending_review;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={isAdmin ? `/admin/lms/${cursoId}` : `/admin/lms`}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <IoArrowBackOutline size={16} /> {course.title}
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Entregas</h1>
            <p className="text-sm text-slate-500 mt-1">
              Revisá y devolvé las guías trabajadas de los alumnos
            </p>
          </div>

          {/* Team filter (only relevant for coaches with assigned students) */}
          {assignedStudentIds.size > 0 && (
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <Link
                href={`?lesson=${activeLessonId}&team=all`}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  !showTeam ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Todos ({submissions.length})
              </Link>
              <Link
                href={`?lesson=${activeLessonId}&team=mine`}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  showTeam ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Mi equipo ({myTeamCount})
              </Link>
            </div>
          )}
        </div>

        {lessonList.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-slate-500 text-sm">Ninguna clase requiere entrega todavía.</p>
            {isAdmin && (
              <Link href={`/admin/lms/${cursoId}`} className="mt-3 inline-block text-sm font-bold text-[#00A9CE] hover:text-blue-700">
                Activar entregas en las clases →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">

            {/* Lesson sidebar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-fit lg:sticky lg:top-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Clases con entrega</p>
              <div className="space-y-1">
                {lessonList.map((l: any) => {
                  const lessonSubs = submissions.filter(() => l.id === activeLessonId);
                  const pending = l.id === activeLessonId ? pendingCount : 0;
                  return (
                    <Link
                      key={l.id}
                      href={`?lesson=${l.id}&team=${team}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        l.id === activeLessonId
                          ? 'bg-[#00A9CE]/10 text-[#00A9CE] font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">
                        {l.modules?.order_index}.{l.order_index} {l.title}
                      </span>
                      {l.id === activeLessonId && pending > 0 && (
                        <span className="ml-2 shrink-0 bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          {pending}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Submission cards */}
            <div className="space-y-4">
              {activeLessonId && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900">{activeLesson?.title}</h2>
                    {dueDate && (
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <IoTimeOutline size={13} />
                        Vence: {dueDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Status filter tabs */}
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: 'all',            label: 'Todas',         color: 'bg-slate-100 text-slate-700' },
                      { id: 'pending_review', label: 'Pendientes',    color: 'bg-amber-100 text-amber-800' },
                      { id: 'reviewed',       label: 'En revisión',   color: 'bg-[#00A9CE]/10 text-[#00A9CE]' },
                      { id: 'approved',       label: 'Aprobadas',     color: 'bg-emerald-100 text-emerald-800' },
                    ] as const).map(tab => {
                      const count = countByStatus[tab.id as keyof typeof countByStatus];
                      const isActive = statusFilter === tab.id;
                      return (
                        <Link
                          key={tab.id}
                          href={`?lesson=${activeLessonId}&team=${team}&status=${tab.id}`}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isActive
                              ? `${tab.color} border-current shadow-sm`
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {tab.label}
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                            isActive ? 'bg-white/60' : 'bg-slate-100 text-slate-500'
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
                // Sort: pending first, then reviewed, then approved
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
                          submitted_at: sub.submitted_at,
                          is_late: sub.is_late,
                          version: sub.version,
                          status: sub.status ?? 'pending_review',
                          user_id: sub.user_id,
                        }}
                        latestReview={latestReview}
                        courseId={cursoId}
                        lessonId={activeLessonId!}
                        reviewerProfileId={profile?.id ?? ''}
                        isMyTeam={assignedStudentIds.has(studentProfileId)}
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
