import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  IoArrowBackOutline,
  IoCheckmarkCircle,
  IoPlayCircleOutline,
  IoDocumentOutline,
  IoCloudUploadOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default async function ActividadPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; lesson?: string }>;
}) {
  const { course: filterCourse, lesson: filterLesson } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (!['admin', 'sysadmin', 'super_admin'].includes(profile?.role ?? '')) redirect('/dashboard');

  // Courses with LMS content
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('is_published', true)
    .order('title');

  const activeCourseId = filterCourse ?? (courses?.[0]?.id ?? null);

  // Lessons for active course
  const { data: rawLessons } = activeCourseId ? await supabase
    .from('lessons')
    .select('id, title, order_index, status, requires_submission, modules(id, title, order_index, course_id)')
    .eq('is_published', true)
    .order('order_index', { ascending: true }) : { data: [] };

  const lessons = ((rawLessons || []) as any[]).filter(
    (l) => (l.modules as any)?.course_id === activeCourseId
  );

  const activeLessonId = filterLesson ?? lessons[0]?.id ?? null;

  // Enrolled students for this course
  let rows: any[] = [];

  if (activeCourseId && activeLessonId) {
    const { data: cycles } = await supabase
      .from('cycles')
      .select('id')
      .eq('course_id', activeCourseId);

    const cycleIds = (cycles || []).map((c: any) => c.id);

    if (cycleIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, user_id, profiles(id, first_name, last_name, email)')
        .in('cycle_id', cycleIds)
        .in('status', ['active', 'completed']);

      const profileIds = (enrollments || []).map((e: any) => e.profiles?.id).filter(Boolean) as string[];

      let progressMap: Record<string, any> = {};
      let resourceOpensMap: Record<string, number> = {};
      let submissionsMap: Record<string, any> = {};

      if (profileIds.length > 0) {
        const { data: progresses } = await supabase
          .from('lesson_progress')
          .select('user_id, lesson_id, completed, completed_at, entered_at, video_played_at')
          .eq('lesson_id', activeLessonId)
          .in('user_id', profileIds);

        (progresses || []).forEach((p: any) => { progressMap[p.user_id] = p; });

        // Count resource opens for this lesson's resources
        const { data: lessonResources } = await supabase
          .from('lesson_resources')
          .select('id')
          .eq('lesson_id', activeLessonId);

        const resourceIds = (lessonResources || []).map((r: any) => r.id);

        if (resourceIds.length > 0) {
          const { data: opens } = await supabase
            .from('resource_opens')
            .select('user_id, lesson_resource_id')
            .in('user_id', profileIds)
            .in('lesson_resource_id', resourceIds);

          (opens || []).forEach((o: any) => {
            resourceOpensMap[o.user_id] = (resourceOpensMap[o.user_id] ?? 0) + 1;
          });
        }

        // Latest submission per student
        const { data: subs } = await supabase
          .from('submissions')
          .select('user_id, submitted_at, is_late, version')
          .eq('lesson_id', activeLessonId)
          .in('user_id', profileIds)
          .order('version', { ascending: false });

        (subs || []).forEach((s: any) => {
          if (!submissionsMap[s.user_id]) submissionsMap[s.user_id] = s;
        });
      }

      rows = (enrollments || []).map((e: any) => {
        const pid = e.profiles?.id;
        const prog = progressMap[pid] ?? null;
        const sub = submissionsMap[pid] ?? null;
        return {
          enrollmentId: e.id,
          profileId: pid,
          firstName: e.profiles?.first_name ?? '',
          lastName: e.profiles?.last_name ?? '',
          email: e.profiles?.email ?? '',
          enteredAt: prog?.entered_at ?? null,
          videoPlayedAt: prog?.video_played_at ?? null,
          resourceOpens: resourceOpensMap[pid] ?? 0,
          completed: prog?.completed ?? false,
          completedAt: prog?.completed_at ?? null,
          submittedAt: sub?.submitted_at ?? null,
          isLate: sub?.is_late ?? false,
          submissionVersion: sub?.version ?? null,
        };
      });

      rows.sort((a, b) => a.lastName.localeCompare(b.lastName));
    }
  }

  const activeLesson = lessons.find((l: any) => l.id === activeLessonId);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex items-center gap-4">
          <Link
            href="/admin/lms"
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <IoArrowBackOutline /> Campus LMS
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Actividad de Alumnos</h1>
          <p className="text-slate-500 text-sm mt-1">
            Seguimiento de acceso, video, materiales y entregas por clase
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Curso</label>
            <div className="flex flex-wrap gap-2">
              {(courses || []).map((c: any) => (
                <Link
                  key={c.id}
                  href={`?course=${c.id}`}
                  className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                    c.id === activeCourseId
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c.title}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {activeCourseId && (
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">

            {/* Lesson list */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-fit sticky top-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Clases</p>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {lessons.map((l: any) => (
                  <Link
                    key={l.id}
                    href={`?course=${activeCourseId}&lesson=${l.id}`}
                    className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      l.id === activeLessonId
                        ? 'bg-[#00A9CE]/10 text-[#00A9CE] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {(l.modules as any)?.order_index}.{l.order_index} {l.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Activity table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {activeLesson && (
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-bold text-slate-900 text-sm">{activeLesson.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {activeLesson.requires_submission && (
                      <span className="flex items-center gap-1 font-bold text-blue-600">
                        <IoCloudUploadOutline size={12} /> Requiere entrega
                      </span>
                    )}
                    <span>{rows.length} alumno{rows.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}

              {rows.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm italic">
                  Seleccioná un curso y una clase para ver la actividad.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Alumno</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          <IoPlayCircleOutline className="inline mr-1" size={12} />Entró
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          Video
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          <IoDocumentOutline className="inline mr-1" size={12} />Materiales
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          <IoCheckmarkCircle className="inline mr-1" size={12} />Completó
                        </th>
                        {activeLesson?.requires_submission && (
                          <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            <IoCloudUploadOutline className="inline mr-1" size={12} />Entrega
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((row) => (
                        <tr key={row.enrollmentId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{row.firstName} {row.lastName}</p>
                            <p className="text-xs text-slate-400">{row.email}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {fmt(row.enteredAt)}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {row.videoPlayedAt ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <IoCheckmarkCircle size={14} /> {fmt(row.videoPlayedAt)}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {row.resourceOpens > 0 ? (
                              <span className="text-emerald-600 font-bold">{row.resourceOpens} abierto{row.resourceOpens !== 1 ? 's' : ''}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {row.completed ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <IoCheckmarkCircle size={14} /> {fmt(row.completedAt)}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          {activeLesson?.requires_submission && (
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {row.submittedAt ? (
                                <span className={`font-bold flex items-center gap-1 ${row.isLate ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {row.isLate
                                    ? <IoAlertCircleOutline size={14} />
                                    : <IoCheckmarkCircle size={14} />}
                                  v{row.submissionVersion} · {fmt(row.submittedAt)}
                                  {row.isLate && ' (tarde)'}
                                </span>
                              ) : (
                                <span className="text-slate-300">Pendiente</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
