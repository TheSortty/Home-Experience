import React from 'react';
import Link from 'next/link';
import {
  IoPlayCircleOutline, IoCheckmarkCircleOutline, IoFlameOutline,
  IoTimeOutline, IoChevronForwardOutline, IoBookOutline, IoCalendarOutline,
} from 'react-icons/io5';
import { createClient } from '@/utils/supabase/server';
import QuoteOfTheDay from '../_components/QuoteOfTheDay';

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function parseDateLocal(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Saludo según la hora local en Argentina, no la hora del servidor.
function getGreeting(): string {
  const hour = parseInt(
    new Intl.DateTimeFormat('es-AR', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date()),
    10,
  );
  if (hour < 6) return 'Estás despierta';
  if (hour < 12) return 'Buen día';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function getYoutubeThumbnail(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

export default async function CampusDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let firstName = 'Alumno';
  let enrollments: any[] = [];
  let completedCount = 0;
  let totalLessonsCount = 0;
  let nextLesson: { lessonId: string; lessonTitle: string; courseId: string; moduleName: string; cycleName: string; videoUrl: string | null } | null = null;
  let upcomingSessions: any[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, id')
      .eq('user_id', user.id)
      .single();

    if (profile?.first_name) firstName = profile.first_name;

    if (profile?.id) {
      const { data: userEnrollments } = await supabase
        .from('enrollments')
        .select('id, status, cycles(id, name, course_id, courses(id, title, cover_image_url))')
        .eq('user_id', profile.id)
        .eq('status', 'active');

      enrollments = userEnrollments || [];

      const cycleIds = enrollments.map((e: any) => e.cycles?.id).filter(Boolean);
      const courseIds = enrollments.map((e: any) => e.cycles?.course_id).filter(Boolean);

      // Completed lessons count
      if (courseIds.length > 0) {
        const { count } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('completed', true);
        completedCount = count ?? 0;

        // Modules + lessons for progress and next lesson detection
        const { data: modules } = await supabase
          .from('modules')
          .select('id, title, course_id, order_index, lessons(id, title, order_index, video_url)')
          .in('course_id', courseIds)
          .order('order_index', { ascending: true });

        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', profile.id)
          .eq('completed', true);

        const completedIds = new Set((progress || []).map((p: any) => p.lesson_id));

        let allLessons = 0;
        for (const mod of (modules || [])) {
          allLessons += (mod.lessons as any[])?.length ?? 0;
        }
        totalLessonsCount = allLessons;

        // Find first incomplete lesson ordered by module/lesson index
        const sortedMods = (modules || []).sort((a: any, b: any) => a.order_index - b.order_index);
        outer: for (const mod of sortedMods) {
          const lessons = ((mod.lessons as any[]) || []).sort((a: any, b: any) => a.order_index - b.order_index);
          for (const lesson of lessons) {
            if (!completedIds.has(lesson.id)) {
              const enrollment = enrollments.find((e: any) => e.cycles?.course_id === mod.course_id);
              nextLesson = {
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                courseId: mod.course_id,
                moduleName: mod.title,
                cycleName: enrollment?.cycles?.name ?? 'Programa',
                videoUrl: lesson.video_url ?? null,
              };
              break outer;
            }
          }
        }
      }

      // Upcoming sessions (next 3)
      if (cycleIds.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: sessions } = await supabase
          .from('cycle_sessions')
          .select('id, session_date, label, cycle_id, cycles(name)')
          .in('cycle_id', cycleIds)
          .gte('session_date', todayStr)
          .order('session_date', { ascending: true })
          .limit(3);
        upcomingSessions = sessions || [];
      }
    }
  }

  const activeCoursesCount = enrollments.length;
  const overallProgress = totalLessonsCount > 0
    ? Math.round((completedCount / totalLessonsCount) * 100)
    : 0;

  const nextSessionDate = upcomingSessions[0]
    ? parseDateLocal(upcomingSessions[0].session_date)
    : null;
  const nextSessionLabel = nextSessionDate
    ? `${nextSessionDate.getDate()} ${MONTHS_ES[nextSessionDate.getMonth()]}`
    : 'Todavía nada';

  return (
    <div className="space-y-8 pb-12">

      {/* GREETING */}
      <section className="bg-cream rounded-2xl border border-cream-deep p-6 md:p-8">
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-ink">{getGreeting()}, {firstName}.</h1>
        <p className="text-slate-600 mt-2 font-medium italic font-serif">¿Con qué llegás hoy?</p>
        <QuoteOfTheDay />
      </section>

      {/* STATS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <IoBookOutline size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Programas en curso</p>
            <p className="text-2xl font-bold text-slate-900">{activeCoursesCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <IoCheckmarkCircleOutline size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Clases atravesadas</p>
            <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
            <IoFlameOutline size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Cuánto recorriste</p>
            <p className="text-2xl font-bold text-slate-900">{overallProgress}%</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center">
            <IoTimeOutline size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Próximo encuentro</p>
            <p className="text-base font-bold text-slate-900 truncate">{nextSessionLabel}</p>
          </div>
        </div>
      </section>

      {/* CONTINUE LEARNING */}
      {nextLesson && (
        <section>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-900 mb-4">Por dónde vas</h2>
          <Link
            href={`/cursos/${nextLesson.courseId}/${nextLesson.lessonId}`}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row group hover:shadow-md transition-shadow"
          >
            <div className="w-full md:w-64 h-48 md:h-auto relative overflow-hidden flex-shrink-0">
              {getYoutubeThumbnail(nextLesson.videoUrl) ? (
                <>
                  <img
                    src={getYoutubeThumbnail(nextLesson.videoUrl)!}
                    alt={nextLesson.lessonTitle}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-[#00A9CE]" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <IoPlayCircleOutline size={64} className="text-white/90 group-hover:scale-110 transition-transform duration-300 drop-shadow-lg" />
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wide">
                  {nextLesson.cycleName}
                </span>
                <span className="text-xs text-slate-400 font-medium">{nextLesson.moduleName}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{nextLesson.lessonTitle}</h3>
              <p className="text-slate-500 text-sm mb-6">Volvé a lo último que dejaste abierto.</p>
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                  <span>Tu recorrido</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00A9CE] rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* PROGRAMS + AGENDA GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Programs — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-900">Tus programas</h2>
            <Link href="/cursos" className="text-sm font-medium text-[#00A9CE] hover:underline flex items-center gap-1">
              Ver todos <IoChevronForwardOutline />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.length > 0 ? (
              enrollments.map((enr: any, idx: number) => {
                const courseId = enr.cycles?.course_id;
                const href = courseId ? `/cursos/${courseId}` : '/cursos';
                return (
                  <Link
                    key={enr.id}
                    href={href}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-[#00A9CE]/30 hover:shadow-md transition-all"
                  >
                    <div className={`h-32 relative overflow-hidden ${enr.cycles?.courses?.cover_image_url ? '' : `bg-gradient-to-r ${idx % 2 === 0 ? 'from-[#00A9CE] to-blue-600' : 'from-emerald-400 to-teal-500'}`}`}>
                      {enr.cycles?.courses?.cover_image_url && (
                        <img
                          src={enr.cycles.courses.cover_image_url}
                          alt={enr.cycles?.courses?.title ?? ''}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-3 right-3 px-2 py-1 bg-white/20 backdrop-blur-md rounded-md text-white text-xs font-bold">
                        Cursando
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-slate-900 mb-1">{enr.cycles?.courses?.title ?? enr.cycles?.name ?? 'Programa'}</h3>
                      {enr.cycles?.courses?.title && enr.cycles?.name && (
                        <p className="text-xs text-slate-500 mb-1">{enr.cycles.name}</p>
                      )}
                      <div className="mt-auto pt-4 border-t border-slate-100">
                        <div className="flex justify-between text-xs font-medium text-slate-500">
                          <span>En este momento</span>
                          <span className="text-[#00A9CE]">Lo estás transitando</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-2 bg-cream border-2 border-dashed border-cream-deep rounded-xl p-8 text-center text-slate-600 font-serif italic">
                Cuando arranques tu próximo programa, lo vas a ver acá.
              </div>
            )}
          </div>
        </div>

        {/* Agenda — 1 col */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-900">Próximos encuentros</h2>
          </div>

          {upcomingSessions.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              {upcomingSessions.map((s: any) => {
                const d = parseDateLocal(s.session_date);
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={s.id} className="p-4 flex items-center gap-3">
                    <div className={`flex flex-col items-center justify-center w-11 h-11 rounded-lg flex-shrink-0 border ${
                      isToday ? 'bg-[#00A9CE] border-[#00A9CE] text-white' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-white/80' : 'text-slate-400'}`}>
                        {MONTHS_ES[d.getMonth()]}
                      </span>
                      <span className={`text-base font-black leading-none ${isToday ? 'text-white' : 'text-[#00A9CE]'}`}>
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{s.label ?? s.cycles?.name ?? 'Sesión'}</p>
                      <p className="text-xs text-slate-400">{s.cycles?.name}</p>
                    </div>
                    {isToday && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                        Hoy
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-cream rounded-xl border border-cream-deep p-4 text-center text-slate-600 text-sm font-serif italic">
              Por ahora, nada en agenda. Te avisamos cuando se sume un encuentro.
            </div>
          )}

          <Link href="/calendario" className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <IoCalendarOutline size={16} />
            Abrir el calendario completo
          </Link>
        </div>
      </div>
    </div>
  );
}
