'use client';

import { useState, useMemo } from 'react';
import {
  IoChevronBackOutline, IoChevronForwardOutline,
  IoCheckmarkCircleOutline, IoCloseCircleOutline, IoEllipseOutline,
  IoCalendarOutline,
} from 'react-icons/io5';
import { colorForProgram } from '../../_lib/programColor';

export type CalendarSession = {
  id: string;
  session_date: string;          // YYYY-MM-DD
  label: string | null;
  is_mandatory: boolean;
  cycleName: string;
  cycleType: string;
  attendanceStatus: string | null;
};

interface Props {
  sessions: CalendarSession[];
  todayISO: string;              // YYYY-MM-DD (server-rendered, matches local Argentina day)
}

const FULL_MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const FULL_DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const SHORT_DAYS_ES = ['L','M','M','J','V','S','D'];   // Monday-first week

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Build a 6×7 grid of dates starting on Monday.
function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const dow = firstOfMonth.getDay();          // 0 = Sun
  const offset = dow === 0 ? 6 : dow - 1;     // Monday-first
  const start = new Date(year, month, 1 - offset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
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

export default function CalendarView({ sessions, todayISO }: Props) {
  const today = parseISO(todayISO);

  // Initial month: month of the next upcoming session, falling back to today's month.
  const initialMonth = useMemo(() => {
    const upcoming = sessions
      .map((s) => parseISO(s.session_date))
      .filter((d) => d.getTime() >= today.getTime())
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const ref = upcoming ?? today;
    return { year: ref.getFullYear(), month: ref.getMonth() };
  }, [sessions, todayISO]);

  const [{ year, month }, setDisplayed] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  // Unique programs the student is enrolled in (for filter chips)
  const programs = useMemo(() => {
    const map = new Map<string, { name: string; type: string; count: number }>();
    for (const s of sessions) {
      const existing = map.get(s.cycleName);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(s.cycleName, { name: s.cycleName, type: s.cycleType, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  // Sessions visible after applying the program filter (used both by the grid
  // dots and by the list panel — they stay in sync).
  const programFilteredSessions = useMemo(() => {
    if (!selectedProgram) return sessions;
    return sessions.filter((s) => s.cycleName === selectedProgram);
  }, [sessions, selectedProgram]);

  // Map: YYYY-MM-DD → sessions (already filtered by program)
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    for (const s of programFilteredSessions) {
      const list = map.get(s.session_date) ?? [];
      list.push(s);
      map.set(s.session_date, list);
    }
    return map;
  }, [programFilteredSessions]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const goPrev = () => {
    const d = new Date(year, month - 1, 1);
    setDisplayed({ year: d.getFullYear(), month: d.getMonth() });
  };
  const goNext = () => {
    const d = new Date(year, month + 1, 1);
    setDisplayed({ year: d.getFullYear(), month: d.getMonth() });
  };
  const goToday = () => {
    setDisplayed({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDate(null);
  };

  // List panel: program filter is already applied via programFilteredSessions.
  // If a day is selected, narrow further to that day. Otherwise sort by upcoming
  // first (chronological) then past (most recent first).
  const listSessions = useMemo(() => {
    if (selectedDate) {
      return sessionsByDate.get(selectedDate) ?? [];
    }
    const sorted = [...programFilteredSessions].sort((a, b) => a.session_date.localeCompare(b.session_date));
    const upcoming = sorted.filter((s) => s.session_date >= todayISO);
    const past = sorted.filter((s) => s.session_date < todayISO).reverse();
    return [...upcoming, ...past];
  }, [selectedDate, programFilteredSessions, sessionsByDate, todayISO]);

  const hasActiveFilter = selectedDate !== null || selectedProgram !== null;
  const clearFilters = () => {
    setSelectedDate(null);
    setSelectedProgram(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:h-full">

      {/* ─── LEFT: month grid ────────────────────────────────────────── */}
      <section className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6 flex flex-col lg:h-full lg:overflow-hidden lg:min-h-0">
        {/* Month header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h2 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-slate-900 capitalize">
            {FULL_MONTHS_ES[month]} <span className="text-slate-400 font-normal">{year}</span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={goPrev}
              aria-label="Mes anterior"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <IoChevronBackOutline size={18} />
            </button>
            <button
              onClick={goNext}
              aria-label="Mes siguiente"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <IoChevronForwardOutline size={18} />
            </button>
          </div>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-1 mb-2 shrink-0">
          {SHORT_DAYS_ES.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {/* Cells — on lg+ rows distribute to fill available height */}
        <div className="grid grid-cols-7 gap-1 lg:grid-rows-6 lg:flex-1 lg:min-h-0">
          {cells.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === month;
            const isToday = iso === todayISO;
            const isSelected = iso === selectedDate;
            const dayList = sessionsByDate.get(iso) ?? [];
            const hasSessions = dayList.length > 0;
            const isPast = iso < todayISO;

            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(isSelected ? null : iso)}
                disabled={!hasSessions && !isToday}
                className={`
                  aspect-square lg:aspect-auto lg:h-full
                  flex flex-col items-stretch p-1.5 gap-1
                  rounded-lg text-sm transition-colors text-left
                  ${isSelected
                    ? 'bg-slate-900 text-white'
                    : isToday
                    ? 'bg-[#00A9CE]/10 ring-1 ring-[#00A9CE]/40'
                    : hasSessions
                    ? 'bg-slate-50 hover:bg-slate-100 cursor-pointer'
                    : !inMonth
                    ? 'opacity-40'
                    : ''
                  }
                  disabled:cursor-default
                `}
                aria-label={hasSessions ? `${d.getDate()} — ${dayList.length} encuentro(s)` : undefined}
              >
                {/* Day number */}
                <span className={`text-xs md:text-sm font-bold leading-none ${
                  isSelected
                    ? 'text-white'
                    : isToday
                    ? 'text-[#00A9CE]'
                    : !inMonth
                    ? 'text-slate-400'
                    : isPast
                    ? 'text-slate-400'
                    : 'text-slate-700'
                }`}>
                  {d.getDate()}
                </span>

                {/* Program color bars — up to 3 visible, "+N" for the rest */}
                {hasSessions && (
                  <div className="flex flex-col gap-0.5 mt-auto">
                    {dayList.slice(0, 3).map((s, i) => {
                      const c = colorForProgram(s.cycleName);
                      return (
                        <span
                          key={i}
                          title={s.label ?? s.cycleName}
                          className={`h-1.5 rounded-full ${
                            isSelected ? 'bg-white/80' : c.dot
                          } ${isPast && !isSelected ? 'opacity-50' : ''}`}
                        />
                      );
                    })}
                    {dayList.length > 3 && (
                      <span className={`text-[9px] font-bold leading-none mt-0.5 ${
                        isSelected ? 'text-white/80' : 'text-slate-500'
                      }`}>
                        +{dayList.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── RIGHT: list panel ───────────────────────────────────────── */}
      <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6 flex flex-col lg:h-full lg:overflow-hidden lg:min-h-0">
        <div className="flex items-baseline justify-between mb-3 shrink-0 gap-2">
          <h2 className="font-serif text-xl font-medium tracking-tight text-slate-900 truncate">
            {selectedDate
              ? parseISO(selectedDate).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
              : selectedProgram
              ? selectedProgram
              : 'Tus encuentros'}
          </h2>
          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Program filter chips */}
        {programs.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
            <button
              onClick={() => setSelectedProgram(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                selectedProgram === null
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              Todos
            </button>
            {programs.map((p) => {
              const c = colorForProgram(p.name);
              const isActive = selectedProgram === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => setSelectedProgram(isActive ? null : p.name)}
                  title={p.name}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 max-w-[12rem] ${
                    isActive
                      ? `${c.chip} border-current`
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                  <span className="truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {listSessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <IoCalendarOutline size={36} className="text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              {selectedDate
                ? 'Nada agendado para este día.'
                : selectedProgram
                ? 'Este programa no tiene encuentros.'
                : 'Cuando tu programa arranque, vas a verlo acá.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto -mr-2 pr-2">
            {listSessions.map((s) => {
              const isPast = s.session_date < todayISO;
              const isToday = s.session_date === todayISO;
              const d = parseISO(s.session_date);
              const colors = colorForProgram(s.cycleName);

              return (
                <li
                  key={s.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    isToday
                      ? 'border-[#00A9CE]/40 bg-[#00A9CE]/5'
                      : isPast
                      ? 'border-slate-100 bg-slate-50/60'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {/* Date badge */}
                  <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0 ${
                    isToday
                      ? 'bg-[#00A9CE] text-white'
                      : isPast
                      ? 'bg-white border border-slate-200 text-slate-400'
                      : 'bg-slate-900 text-white'
                  }`}>
                    <span className="text-[10px] font-bold uppercase opacity-80">
                      {FULL_MONTHS_ES[d.getMonth()].slice(0, 3)}
                    </span>
                    <span className="text-base font-black leading-none">
                      {d.getDate()}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm leading-tight truncate ${isPast ? 'text-slate-600' : 'text-slate-900'}`}>
                      {s.label ?? s.cycleName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {FULL_DAYS_ES[d.getDay()]}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${colors.chip}`}>
                        {s.cycleName}
                      </span>
                      {s.is_mandatory && !isPast && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Obligatoria
                        </span>
                      )}
                      {isPast && <AttendanceBadge status={s.attendanceStatus} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

    </div>
  );
}
