import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { IoArrowBackOutline, IoCheckmarkCircle, IoAlertCircleOutline, IoTimeOutline } from 'react-icons/io5';
import ReviewForm from './ReviewForm';
import DownloadButton from './DownloadButton';

export default async function EntregasPage({
  params,
  searchParams,
}: {
  params: Promise<{ cursoId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { cursoId } = await params;
  const { lesson: filterLesson } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (!['admin', 'sysadmin', 'super_admin'].includes(profile?.role ?? '')) redirect('/dashboard');

  const { data: course } = await supabase
    .from('courses').select('id, title').eq('id', cursoId).single();
  if (!course) notFound();

  // Lessons that require submission in this course
  const { data: lessonsWithSubmission } = await supabase
    .from('lessons')
    .select('id, title, order_index, unlocked_at, due_days_after_unlock, modules(title, order_index)')
    .eq('requires_submission', true)
    .filter('module_id', 'in', `(SELECT id FROM modules WHERE course_id = '${cursoId}')`)

  // Build lesson filter list
  const lessonList = (lessonsWithSubmission || []) as any[];

  const activeLessonId = filterLesson ?? lessonList[0]?.id;

  // Fetch all submissions for the active lesson, joining profile + reviews
  let submissions: any[] = [];
  if (activeLessonId) {
    const { data: subs } = await supabase
      .from('submissions')
      .select(`
        id, file_name, storage_path, submitted_at, is_late, version,
        user_id,
        profiles (first_name, last_name, email),
        submission_reviews (
          id, feedback_text, revised_file_name, revised_storage_path, reviewed_at
        )
      `)
      .eq('lesson_id', activeLessonId)
      .order('submitted_at', { ascending: false });

    // Keep only latest version per user
    const byUser: Record<string, any> = {};
    for (const sub of subs || []) {
      if (!byUser[sub.user_id] || sub.version > byUser[sub.user_id].version) {
        byUser[sub.user_id] = sub;
      }
    }
    submissions = Object.values(byUser);
  }

  const activeLesson = lessonList.find((l: any) => l.id === activeLessonId);

  const dueDate = activeLesson?.unlocked_at && activeLesson?.due_days_after_unlock
    ? new Date(new Date(activeLesson.unlocked_at).getTime() + activeLesson.due_days_after_unlock * 86400000)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">

        <div className="flex items-center gap-4">
          <Link
            href={`/admin/lms/${cursoId}`}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <IoArrowBackOutline /> {course.title}
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entregas</h1>
          <p className="text-slate-500 text-sm mt-1">Revisá y respondé las entregas de los alumnos</p>
        </div>

        {lessonList.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-slate-500 text-sm">Ninguna clase requiere entrega todavía.</p>
            <Link
              href={`/admin/lms/${cursoId}`}
              className="mt-3 inline-block text-sm font-bold text-[#00A9CE] hover:text-blue-700"
            >
              Activar entregas en las clases →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">

            {/* Lesson selector sidebar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-fit sticky top-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Clases con entrega</p>
              <div className="space-y-1">
                {lessonList.map((l: any) => (
                  <Link
                    key={l.id}
                    href={`?lesson=${l.id}`}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      l.id === activeLessonId
                        ? 'bg-[#00A9CE]/10 text-[#00A9CE] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {l.modules?.order_index}.{l.order_index} {l.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Submissions list */}
            <div className="space-y-4">
              {activeLessonId && (
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">{activeLesson?.title}</h2>
                  {dueDate && (
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <IoTimeOutline size={14} />
                      Vence: {dueDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                    {submissions.length} entrega{submissions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {submissions.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                  <p className="text-slate-400 text-sm italic">Todavía no hay entregas para esta clase.</p>
                </div>
              ) : (
                submissions.map((sub) => {
                  const latestReview = (sub.submission_reviews || []).sort(
                    (a: any, b: any) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime()
                  )[0] ?? null;
                  const firstName = (sub.profiles as any)?.first_name ?? '';
                  const lastName = (sub.profiles as any)?.last_name ?? '';
                  const email = (sub.profiles as any)?.email ?? '';

                  return (
                    <div
                      key={sub.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900">
                              {firstName} {lastName}
                            </p>
                            {sub.is_late && (
                              <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                ATRASADA
                              </span>
                            )}
                            {latestReview && (
                              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1">
                                <IoCheckmarkCircle size={11} /> Revisada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-slate-500">v{sub.version}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(sub.submitted_at).toLocaleDateString('es-AR', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <DownloadButton storagePath={sub.storage_path} label={sub.file_name} />
                      </div>

                      {latestReview && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-600">
                          <p className="text-xs font-bold text-slate-400 mb-1">Tu devolución anterior:</p>
                          <p className="whitespace-pre-line">{latestReview.feedback_text}</p>
                          {latestReview.revised_file_name && (
                            <DownloadButton
                              storagePath={latestReview.revised_storage_path}
                              label={latestReview.revised_file_name}
                            />
                          )}
                        </div>
                      )}

                      <ReviewForm
                        submissionId={sub.id}
                        courseId={cursoId}
                        lessonId={activeLessonId!}
                        existingReview={latestReview}
                      />
                    </div>
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
