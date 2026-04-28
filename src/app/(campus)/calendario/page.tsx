import { createClient } from '@/utils/supabase/server';
import { IoCalendarOutline, IoTimeOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoEllipseOutline } from 'react-icons/io5';

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function parseDateLocal(dateStr: string) {
  // date string is YYYY-MM-DD (DATE type, no timezone)
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function AttendanceBadge({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === 'present' || status === 'late')
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <IoCheckmarkCircleOutline size={13} /> Presente
      </span>
    );
  if (status === 'absent')
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <IoCloseCircleOutline size={13} /> Ausente
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <IoEllipseOutline size={13} /> {status}
    </span>
  );
}

type CycleType = 'initial' | 'advanced' | 'plan_lider' | string;

const CYCLE_COLORS: Record<string, string> = {
  initial: 'bg-[#00A9CE]/10 text-[#00A9CE]',
  advanced: 'bg-emerald-100 text-emerald-700',
  plan_lider: 'bg-violet-100 text-violet-700',
};

export default async function CampusCalendarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  type Session = {
    id: string;
    cycle_id: string;
    session_date: string;
    label: string | null;
    is_mandatory: boolean;
    cycleName: string;
    cycleType: CycleType;
    enrollmentId: string;
    attendanceStatus: string | null;
  };

  let sessions: Session[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

        const enrollmentByCycle: Record<string, { enrollmentId: string; cycleName: string; cycleType: string }> = {};
        (enrollments || []).forEach((e: any) => {
          const courseTitle = e.cycles?.courses?.title;
          const rawCycleName = e.cycles?.name;
          // Prefer course title, fall back to cycle name
          const displayName = courseTitle || rawCycleName || 'Programa';
          enrollmentByCycle[e.cycle_id] = {
            enrollmentId: e.id,
            cycleName: displayName,
            cycleType: e.cycles?.type ?? 'initial',
          };
        });

        sessions = (rawSessions || []).map((s: any) => ({
          ...s,
          cycleName: enrollmentByCycle[s.cycle_id]?.cycleName ?? 'Programa',
          cycleType: enrollmentByCycle[s.cycle_id]?.cycleType ?? 'initial',
          enrollmentId: enrollmentByCycle[s.cycle_id]?.enrollmentId ?? '',
          attendanceStatus: attendanceMap[s.id] ?? null,
        }));
      }
    }
  }

  // Group by month
  type MonthGroup = { key: string; label: string; sessions: Session[] };
  const grouped: MonthGroup[] = [];
  const monthMap: Record<string, number> = {};

  sessions.forEach((s) => {
    const d = parseDateLocal(s.session_date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthMap[key] === undefined) {
      monthMap[key] = grouped.length;
      grouped.push({ key, label: `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`, sessions: [] });
    }
    grouped[monthMap[key]].sessions.push(s);
  });

  const upcoming = sessions.filter((s) => parseDateLocal(s.session_date) >= today);
  const past = sessions.filter((s) => parseDateLocal(s.session_date) < today);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">

      <section className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <IoCalendarOutline className="text-[#00A9CE]" /> Calendario
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Tus sesiones sincrónicas y eventos de los programas.
          </p>
        </div>
        {sessions.length > 0 && (
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span><strong className="text-slate-800">{upcoming.length}</strong> próximas</span>
            <span><strong className="text-slate-800">{past.length}</strong> pasadas</span>
          </div>
        )}
      </section>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <IoCalendarOutline size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-bold text-slate-700 mb-1">Sin sesiones registradas</h3>
          <p className="text-sm text-slate-500">Las sesiones sincrónicas de tus programas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.sessions.map((s) => {
                  const d = parseDateLocal(s.session_date);
                  const isPast = d < today;
                  const isToday = d.toDateString() === today.toDateString();
                  const colorCls = CYCLE_COLORS[s.cycleType] ?? CYCLE_COLORS.initial;

                  return (
                    <div
                      key={s.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                        isToday
                          ? 'border-[#00A9CE]/40 bg-[#00A9CE]/5 shadow-sm'
                          : isPast
                          ? 'border-slate-100 opacity-60'
                          : 'border-slate-100 hover:border-slate-200 hover:shadow-sm bg-slate-50/50'
                      }`}
                    >
                      {/* Date badge */}
                      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg border shadow-sm flex-shrink-0 ${
                        isToday ? 'bg-[#00A9CE] border-[#00A9CE] text-white' : 'bg-white border-slate-200'
                      }`}>
                        <span className={`text-xs font-bold uppercase ${isToday ? 'text-white/80' : 'text-slate-400'}`}>
                          {DAYS_ES[d.getDay()]}
                        </span>
                        <span className={`text-xl font-black leading-none ${isToday ? 'text-white' : isPast ? 'text-slate-500' : 'text-[#00A9CE]'}`}>
                          {d.getDate()}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 truncate">
                            {s.label ?? s.cycleName}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-md w-fit ${colorCls}`}>
                              {s.cycleName}
                            </span>
                            {isPast && <AttendanceBadge status={s.attendanceStatus} />}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                          <span className="flex items-center gap-1">
                            <IoTimeOutline size={14} />
                            {isToday ? 'Hoy' : isPast ? d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                          {s.is_mandatory && (
                            <span className="text-amber-600 font-bold">Obligatoria</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
