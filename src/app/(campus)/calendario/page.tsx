import { createClient } from '@/utils/supabase/server';
import { IoCalendarOutline } from 'react-icons/io5';
import CalendarView, { type CalendarSession } from './_components/CalendarView';

// Buenos Aires "today" as YYYY-MM-DD — the source of truth for past/future split.
function todayInArgentinaISO(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date()); // en-CA gives YYYY-MM-DD
}

export default async function CampusCalendarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let sessions: CalendarSession[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, cycle_id, cycles(id, name, type, course_id, courses(title))')
        .eq('user_id', profile.id)
        .in('status', ['active', 'completed']);

      const cycleIds = (enrollments || []).map((e: any) => e.cycle_id).filter(Boolean);

      if (cycleIds.length > 0) {
        const { data: rawSessions } = await supabase
          .from('cycle_sessions')
          .select('id, cycle_id, session_date, label, is_mandatory')
          .in('cycle_id', cycleIds)
          .order('session_date', { ascending: true });

        const sessionIds = (rawSessions || []).map((s: any) => s.id);
        const enrollmentIds = (enrollments || []).map((e: any) => e.id);

        const { data: attendance } = sessionIds.length > 0
          ? await supabase
              .from('attendance')
              .select('enrollment_id, cycle_session_id, status')
              .in('enrollment_id', enrollmentIds)
              .in('cycle_session_id', sessionIds)
          : { data: [] };

        const attendanceMap: Record<string, string> = {};
        (attendance || []).forEach((a: any) => {
          attendanceMap[a.cycle_session_id] = a.status;
        });

        const enrollmentByCycle: Record<string, { cycleName: string; cycleType: string }> = {};
        (enrollments || []).forEach((e: any) => {
          const courseTitle = e.cycles?.courses?.title;
          const rawCycleName = e.cycles?.name;
          enrollmentByCycle[e.cycle_id] = {
            cycleName: courseTitle || rawCycleName || 'Programa',
            cycleType: e.cycles?.type ?? 'initial',
          };
        });

        sessions = (rawSessions || []).map((s: any) => ({
          id: s.id,
          session_date: s.session_date,
          label: s.label,
          is_mandatory: s.is_mandatory,
          cycleName: enrollmentByCycle[s.cycle_id]?.cycleName ?? 'Programa',
          cycleType: enrollmentByCycle[s.cycle_id]?.cycleType ?? 'initial',
          attendanceStatus: attendanceMap[s.id] ?? null,
        }));
      }
    }
  }

  const todayISO = todayInArgentinaISO();

  return (
    // On lg+ we lock the page to viewport height so only the list scrolls
    // internally. On mobile the layout stacks and we allow natural page scroll.
    <div className="lg:h-[calc(100vh-9rem)] flex flex-col gap-4">
      <header className="shrink-0">
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-slate-900 flex items-center gap-3">
          <IoCalendarOutline className="text-[#00A9CE] shrink-0" /> Tus encuentros
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Las fechas en las que vamos a estar juntos.
        </p>
      </header>

      <div className="flex-1 min-h-0">
        <CalendarView sessions={sessions} todayISO={todayISO} />
      </div>
    </div>
  );
}
