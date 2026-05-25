import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@/src/services/roleService';
import {
  IoArrowBackOutline,
  IoCheckmarkCircle,
  IoPlayCircleOutline,
  IoDocumentOutline,
  IoCloudUploadOutline,
  IoAlertCircleOutline,
  IoBookOutline,
  IoEyeOutline,
} from 'react-icons/io5';

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'hace un momento';
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
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
  if (!isAdminRole(profile?.role ?? '')) redirect('/dashboard');

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('is_published', true)
    .order('title');

  const activeCourseId = filterCourse ?? (courses?.[0]?.id ?? null);

  const { data: rawLessons } = activeCourseId ? await supabase
    .from('lessons')
    .select('id, title, order_index, status, requires_submission, modules(id, title, order_index, course_id)')
    .eq('is_published', true)
    .order('order_index', { ascending: true }) : { data: [] };

  const lessons = ((rawLessons || []) as any[]).filter(
    (l) => (l.modules as any)?.course_id === activeCourseId
  );

  const activeLessonId = filterLesson ?? lessons[0]?.id ?? null;

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

        const { data: subs } = await supabase
          .from('submissions')
          .select('user_id, submitted_at, is_late, version, status')
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
          submissionStatus: sub?.status ?? null,
        };
      });

      rows.sort((a, b) => a.lastName.localeCompare(b.lastName));
    }
  }

  const activeLesson = lessons.find((l: any) => l.id === activeLessonId);
  const activeCourse = (courses || []).find((c: any) => c.id === activeCourseId);

  // Summary stats
  const entered = rows.filter(r => r.enteredAt).length;
  const watched = rows.filter(r => r.videoPlayedAt).length;
  const completed = rows.filter(r => r.completed).length;
  const submitted = rows.filter(r => r.submittedAt).length;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center gap-4">
          <Link
            href="/admin/lms"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            <IoArrowBackOutline size={16} />
            <span className="hidden sm:inline">Programas</span>
            <span className="sm:hidden">Atrás</span>
          </Link>

          <div className="w-px h-5 bg-slate-200 shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight">Actividad de alumnos</p>
            {activeCourse && (
              <p className="text-xs text-slate-400 truncate hidden sm:block">{activeCourse.title}</p>
            )}
          </div>

          {/* Course switcher (if multiple courses) */}
          {(courses || []).length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0">
              {(courses || []).map((c: any) => (
                <Link
                  key={c.id}
                  href={`?course=${c.id}`}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors truncate max-w-[120px] ${
                    c.id === activeCourseId
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {c.title.split(' ').slice(0, 2).join(' ')}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">

        {/* Course selector (when only one or shown below bar on mobile) */}
        {(courses || []).length === 1 && (
          <div className="flex items-center gap-2">
            <IoBookOutline size={14} className="text-slate-400" />
            <p className="text-sm font-bold text-slate-700">{activeCourse?.title}</p>
          </div>
        )}

        {!activeCourseId ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-14 text-center">
            <IoBookOutline size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">No hay programas publicados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">

            {/* ── Lesson list: tabs on mobile, sidebar on desktop ── */}

            {/* Mobile: horizontal scroll */}
            <div className="lg:hidden -mx-4 px-4 overflow-x-auto pb-1">
              <div className="flex gap-2 w-max">
                {lessons.map((l: any) => (
                  <Link
                    key={l.id}
                    href={`?course=${activeCourseId}&lesson=${l.id}`}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      l.id === activeLessonId
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {(l.modules as any)?.order_index}.{l.order_index} {l.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop: sticky sidebar */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-[72px]">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clases</p>
              </div>
              <div className="p-2 space-y-0.5 max-h-[70vh] overflow-y-auto">
                {lessons.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3">Sin clases publicadas.</p>
                ) : (
                  lessons.map((l: any) => {
                    const isActive = l.id === activeLessonId;
                    return (
                      <Link
                        key={l.id}
                        href={`?course=${activeCourseId}&lesson=${l.id}`}
                        className={`flex items-start gap-2 px-3 py-2.5 rounded-xl transition-all group ${
                          isActive
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className={`text-[10px] font-black shrink-0 mt-0.5 px-1.5 py-0.5 rounded ${
                          isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {(l.modules as any)?.order_index}.{l.order_index}
                        </span>
                        <span className="text-xs font-medium leading-snug line-clamp-2">
                          {l.title}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Activity panel ── */}
            <div className="space-y-4 min-w-0">

              {/* Lesson header */}
              {activeLesson && (
                <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <h2 className="font-bold text-slate-900 text-base leading-tight">
                        {activeLesson.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {activeLesson.requires_submission && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                            <IoCloudUploadOutline size={10} /> Requiere entrega
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {rows.length} alumno{rows.length !== 1 ? 's' : ''} inscripto{rows.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/admin/lms/${activeCourseId}/entregas?lesson=${activeLessonId}`}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#00A9CE] hover:text-blue-700 border border-[#00A9CE]/30 hover:border-[#00A9CE] rounded-xl transition-all"
                    >
                      <IoEyeOutline size={13} />
                      Ver entregas
                    </Link>
                  </div>

                  {/* Stats summary */}
                  {rows.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                      {[
                        { label: 'Entraron', value: entered, total: rows.length, color: 'text-slate-700' },
                        { label: 'Vieron video', value: watched, total: rows.length, color: 'text-[#00A9CE]' },
                        { label: 'Completaron', value: completed, total: rows.length, color: 'text-emerald-600' },
                        ...(activeLesson.requires_submission
                          ? [{ label: 'Entregaron', value: submitted, total: rows.length, color: 'text-amber-600' }]
                          : []),
                      ].map(stat => (
                        <div key={stat.label} className="text-center">
                          <p className={`text-2xl font-black ${stat.color} leading-none`}>
                            {stat.value}
                            <span className="text-sm font-normal text-slate-300">/{stat.total}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Table or empty state */}
              {!activeLesson ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                  <p className="text-slate-400 text-sm">Seleccioná una clase para ver la actividad.</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                  <p className="text-slate-400 text-sm">Ningún alumno inscripto todavía.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Alumno</th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            <span className="flex items-center gap-1"><IoEyeOutline size={11} />Acceso</span>
                          </th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            <span className="flex items-center gap-1"><IoPlayCircleOutline size={11} />Video</span>
                          </th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            <span className="flex items-center gap-1"><IoDocumentOutline size={11} />Mat.</span>
                          </th>
                          <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            <span className="flex items-center gap-1"><IoCheckmarkCircle size={11} />Completó</span>
                          </th>
                          {activeLesson?.requires_submission && (
                            <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                              <span className="flex items-center gap-1"><IoCloudUploadOutline size={11} />Entrega</span>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rows.map((row) => (
                          <tr key={row.enrollmentId} className="hover:bg-slate-50/60 transition-colors">
                            {/* Student */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {(row.firstName?.[0] ?? '').toUpperCase()}{(row.lastName?.[0] ?? '').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                                    {row.firstName} {row.lastName}
                                  </p>
                                  <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{row.email}</p>
                                </div>
                              </div>
                            </td>

                            {/* Entered */}
                            <td className="px-4 py-3">
                              {row.enteredAt ? (
                                <span className="text-xs text-slate-500">{timeAgo(row.enteredAt)}</span>
                              ) : (
                                <span className="text-slate-200 text-xs">—</span>
                              )}
                            </td>

                            {/* Video */}
                            <td className="px-4 py-3">
                              {row.videoPlayedAt ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                                  <IoCheckmarkCircle size={13} />
                                  <span className="text-slate-400 font-normal">{timeAgo(row.videoPlayedAt)}</span>
                                </span>
                              ) : (
                                <span className="text-slate-200 text-xs">—</span>
                              )}
                            </td>

                            {/* Materials */}
                            <td className="px-4 py-3">
                              {row.resourceOpens > 0 ? (
                                <span className="text-xs font-bold text-emerald-600">
                                  {row.resourceOpens}×
                                </span>
                              ) : (
                                <span className="text-slate-200 text-xs">—</span>
                              )}
                            </td>

                            {/* Completed */}
                            <td className="px-4 py-3">
                              {row.completed ? (
                                <span className="flex items-center gap-1">
                                  <IoCheckmarkCircle size={14} className="text-emerald-500 shrink-0" />
                                  <span className="text-[11px] text-slate-400">{timeAgo(row.completedAt)}</span>
                                </span>
                              ) : (
                                <span className="text-slate-200 text-xs">—</span>
                              )}
                            </td>

                            {/* Submission */}
                            {activeLesson?.requires_submission && (
                              <td className="px-4 py-3">
                                {row.submittedAt ? (
                                  <div className="flex items-center gap-1.5">
                                    {row.isLate
                                      ? <IoAlertCircleOutline size={13} className="text-red-500 shrink-0" />
                                      : <IoCheckmarkCircle size={13} className="text-emerald-500 shrink-0" />}
                                    <span className={`text-xs font-bold ${row.isLate ? 'text-red-600' : 'text-emerald-600'}`}>
                                      v{row.submissionVersion}
                                    </span>
                                    <span className="text-[11px] text-slate-400">{timeAgo(row.submittedAt)}</span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-300 italic">Sin entregar</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
