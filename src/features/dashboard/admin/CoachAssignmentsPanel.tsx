'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  IoCloseOutline, IoSearchOutline, IoPersonAddOutline,
  IoAddOutline, IoSwapHorizontalOutline, IoPeopleOutline,
} from 'react-icons/io5';
import { restSelect, restInsert, restUpdate, restDelete } from '../../../services/supabaseRest';
import { isReviewerRole } from '../../../services/roleService';

interface Props {
  courseId: string;
  courseTitle: string;
  linkedCycleIds: string[];
}

interface ProfileLite {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
}

interface CoachAssignmentRow {
  id: string;
  coach_profile_id: string;
  student_profile_id: string;
  cycle_id: string | null;
}

const fullName = (p: ProfileLite) =>
  `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || 'Sin nombre';

const initials = (p: ProfileLite) => {
  const fn = (p.first_name ?? '').trim();
  const ln = (p.last_name ?? '').trim();
  if (fn || ln) return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase() || '·';
  return (p.email ?? '·')[0]?.toUpperCase() ?? '·';
};

// Deterministic color per coach based on initials
const AVATAR_COLORS = [
  'from-[#00A9CE] to-blue-500',
  'from-violet-500 to-purple-600',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-amber-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-blue-600',
];
function avatarColor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function CoachAssignmentsPanel({ courseId, courseTitle, linkedCycleIds }: Props) {
  const [coaches, setCoaches] = useState<ProfileLite[]>([]);
  const [students, setStudents] = useState<ProfileLite[]>([]);
  const [assignments, setAssignments] = useState<CoachAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected coach modal
  const [selectedCoach, setSelectedCoach] = useState<ProfileLite | null>(null);
  // Assign student sub-modal (inside coach modal)
  const [assignOpen, setAssignOpen] = useState(false);
  // Promote modal
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteQuery, setPromoteQuery] = useState('');
  const [promoteResults, setPromoteResults] = useState<ProfileLite[]>([]);
  const [promoteSearching, setPromoteSearching] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [coachesRes, studentsRes, assignmentsRes] = await Promise.all([
        restSelect<ProfileLite>('profiles', {
          columns: 'id,first_name,last_name,email,role',
          filters: { role: 'eq.coach', is_deleted: 'eq.false' },
          order: 'first_name.asc',
        }),
        linkedCycleIds.length > 0
          ? restSelect<any>('enrollments', {
              columns: 'user_id,profile:profiles!user_id(id,first_name,last_name,email,role)',
              filters: {
                cycle_id: `in.(${linkedCycleIds.join(',')})`,
                status: 'in.(active,completed)',
              },
            })
          : Promise.resolve({ data: [], count: null }),
        restSelect<CoachAssignmentRow>('coach_assignments', {
          columns: 'id,coach_profile_id,student_profile_id,cycle_id',
        }),
      ]);

      setCoaches(coachesRes.data);

      const seen = new Set<string>();
      const enrolledStudents: ProfileLite[] = [];
      for (const e of studentsRes.data as any[]) {
        const p = e.profile;
        if (p && !seen.has(p.id)) { seen.add(p.id); enrolledStudents.push(p); }
      }
      setStudents(enrolledStudents);
      setAssignments(assignmentsRes.data);
    } catch (err: any) {
      toast.error('No se pudieron cargar los coaches');
    } finally {
      setLoading(false);
    }
  }, [linkedCycleIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Live search for promote modal
  useEffect(() => {
    if (!promoteOpen) return;
    const q = promoteQuery.trim();
    if (q.length < 2) { setPromoteResults([]); return; }
    setPromoteSearching(true);
    const timer = setTimeout(async () => {
      try {
        const safe = q.replace(/[%,]/g, '');
        const { data } = await restSelect<ProfileLite>('profiles', {
          columns: 'id,first_name,last_name,email,role',
          filters: { is_deleted: 'eq.false', or: `(first_name.ilike.*${safe}*,last_name.ilike.*${safe}*,email.ilike.*${safe}*)` },
          limit: 8,
        });
        setPromoteResults(data.filter(p => !isReviewerRole(p.role ?? '')));
      } catch { /* silent */ } finally {
        setPromoteSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [promoteQuery, promoteOpen]);

  const promoteToCoach = async (profile: ProfileLite) => {
    try {
      await restUpdate('profiles', { role: 'coach' }, { id: `eq.${profile.id}` });
      toast.success(`${fullName(profile)} es ahora coach`);
      setPromoteOpen(false); setPromoteQuery(''); setPromoteResults([]);
      fetchAll();
    } catch (err: any) { toast.error('No se pudo asignar el rol: ' + err.message); }
  };

  const demoteCoach = async (coach: ProfileLite) => {
    const hasAssignments = assignments.some(a => a.coach_profile_id === coach.id);
    if (!window.confirm(hasAssignments
      ? `${fullName(coach)} tiene alumnos asignados. ¿Continuar?`
      : `Quitar el rol de coach a ${fullName(coach)}?`)) return;
    try {
      if (hasAssignments) await restDelete('coach_assignments', { coach_profile_id: `eq.${coach.id}` });
      await restUpdate('profiles', { role: 'student' }, { id: `eq.${coach.id}` });
      toast.success(`${fullName(coach)} vuelve a ser alumno`);
      setSelectedCoach(null);
      fetchAll();
    } catch (err: any) { toast.error('No se pudo quitar el rol: ' + err.message); }
  };

  const assignStudent = async (student: ProfileLite) => {
    if (!selectedCoach) return;
    try {
      await restInsert('coach_assignments', { coach_profile_id: selectedCoach.id, student_profile_id: student.id, cycle_id: null }, { returning: 'minimal' });
      toast.success(`${fullName(student)} → ${fullName(selectedCoach)}`);
      setAssignOpen(false);
      fetchAll();
    } catch (err: any) {
      if (String(err.message).includes('coach_assignments_coach_profile')) toast.error('Ese alumno ya está asignado a este coach');
      else toast.error('No se pudo asignar: ' + err.message);
    }
  };

  const unassignStudent = async (assignmentId: string) => {
    try {
      await restDelete('coach_assignments', { id: `eq.${assignmentId}` });
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast.success('Asignación quitada');
    } catch (err: any) { toast.error('No se pudo quitar: ' + err.message); }
  };

  // Derived
  const studentById = new Map(students.map(s => [s.id, s]));
  const studentsByCoach = new Map<string, ProfileLite[]>();
  for (const a of assignments) {
    const s = studentById.get(a.student_profile_id);
    if (!s) continue;
    const list = studentsByCoach.get(a.coach_profile_id) ?? [];
    list.push(s); studentsByCoach.set(a.coach_profile_id, list);
  }
  const assignmentByStudent = new Map<string, CoachAssignmentRow>();
  for (const a of assignments) assignmentByStudent.set(a.student_profile_id, a);

  // Students not yet assigned to the selected coach
  const unassignedStudents = selectedCoach
    ? students.filter(s => {
        const a = assignmentByStudent.get(s.id);
        return !a || a.coach_profile_id !== selectedCoach.id;
      })
    : [];

  return (
    <>
      {/* ── Compact horizontal panel ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <IoPeopleOutline size={13} /> Equipo de coaches
          </h3>
          <button
            onClick={() => setPromoteOpen(true)}
            className="flex items-center gap-1 text-xs font-bold text-[#00A9CE] hover:underline"
          >
            <IoPersonAddOutline size={13} /> Añadir
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-[#00A9CE] rounded-full animate-spin" />
          </div>
        ) : coaches.length === 0 ? (
          <button
            onClick={() => setPromoteOpen(true)}
            className="w-full border-2 border-dashed border-slate-200 rounded-xl py-5 flex flex-col items-center gap-2 text-slate-400 hover:border-[#00A9CE] hover:text-[#00A9CE] transition-all"
          >
            <IoPersonAddOutline size={22} />
            <span className="text-xs font-bold">Designar primer coach</span>
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            {coaches.map(coach => {
              const count = (studentsByCoach.get(coach.id) ?? []).length;
              return (
                <button
                  key={coach.id}
                  onClick={() => setSelectedCoach(coach)}
                  className="group flex flex-col items-center gap-1.5 transition-transform hover:scale-105 focus:outline-none"
                  title={fullName(coach)}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor(coach.id)} text-white text-sm font-black flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                      {initials(coach)}
                    </div>
                    {count > 0 && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
                        {count}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 max-w-[52px] truncate text-center leading-tight">
                    {coach.first_name ?? fullName(coach).split(' ')[0]}
                  </span>
                </button>
              );
            })}

            {/* Add coach shortcut */}
            <button
              onClick={() => setPromoteOpen(true)}
              className="flex flex-col items-center gap-1.5 group"
              title="Añadir coach"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 text-slate-400 flex items-center justify-center group-hover:border-[#00A9CE] group-hover:text-[#00A9CE] transition-colors">
                <IoAddOutline size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#00A9CE] transition-colors">Añadir</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Coach detail modal ────────────────────────────────────────────── */}
      {selectedCoach && !assignOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedCoach(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Coach header */}
            <div className={`bg-gradient-to-br ${avatarColor(selectedCoach.id)} p-6 text-white relative`}>
              <button
                onClick={() => setSelectedCoach(null)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <IoCloseOutline size={16} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 text-white text-2xl font-black flex items-center justify-center">
                  {initials(selectedCoach)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black leading-tight">{fullName(selectedCoach)}</h3>
                  <p className="text-sm text-white/70 truncate">{selectedCoach.email}</p>
                  <span className="inline-block mt-1.5 text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    Coach
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned students */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-64">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Alumnos asignados
                </p>
                <span className="text-xs font-black text-slate-400">
                  {(studentsByCoach.get(selectedCoach.id) ?? []).length}
                </span>
              </div>

              {(studentsByCoach.get(selectedCoach.id) ?? []).length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-3">Sin alumnos asignados en este programa.</p>
              ) : (
                <div className="space-y-1">
                  {(studentsByCoach.get(selectedCoach.id) ?? []).map(s => {
                    const a = assignmentByStudent.get(s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 group">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {initials(s)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{fullName(s)}</p>
                          <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                        </div>
                        <button
                          onClick={() => a && unassignStudent(a.id)}
                          className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <IoCloseOutline size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => setAssignOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <IoAddOutline size={16} /> Asignar alumno
              </button>
              <button
                onClick={() => demoteCoach(selectedCoach)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
              >
                <IoSwapHorizontalOutline size={13} /> Quitar rol de coach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign student sub-modal ──────────────────────────────────────── */}
      {selectedCoach && assignOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setAssignOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-900">Asignar alumno</h3>
                <button onClick={() => setAssignOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <IoCloseOutline size={20} />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Coach: <span className="font-bold text-slate-700">{fullName(selectedCoach)}</span>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {unassignedStudents.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  {students.length === 0
                    ? 'No hay alumnos inscriptos en ciclos vinculados.'
                    : 'Todos los alumnos ya están asignados a este coach.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {unassignedStudents.map(s => {
                    const existing = assignmentByStudent.get(s.id);
                    const otherCoach = existing ? coaches.find(c => c.id === existing.coach_profile_id) : null;
                    return (
                      <button
                        key={s.id}
                        onClick={() => assignStudent(s)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {initials(s)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{fullName(s)}</p>
                          <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                        </div>
                        {otherCoach && (
                          <span className="text-[9px] font-bold text-amber-600 shrink-0">
                            con {otherCoach.first_name ?? 'otro'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Promote to coach modal ────────────────────────────────────────── */}
      {promoteOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPromoteOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-900">Designar nuevo coach</h3>
              <button onClick={() => { setPromoteOpen(false); setPromoteQuery(''); setPromoteResults([]); }} className="text-slate-400 hover:text-slate-700">
                <IoCloseOutline size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Buscá una persona registrada en HOME para asignarle el rol de coach.
            </p>

            <div className="relative mb-4">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                autoFocus
                value={promoteQuery}
                onChange={e => setPromoteQuery(e.target.value)}
                placeholder="Nombre o email…"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00A9CE]/30 focus:border-[#00A9CE] outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              {promoteQuery.trim().length < 2 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">Escribí al menos 2 letras…</p>
              ) : promoteSearching ? (
                <p className="text-xs text-slate-400 italic text-center py-8">Buscando…</p>
              ) : promoteResults.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">Sin resultados.</p>
              ) : (
                <div className="space-y-1">
                  {promoteResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => promoteToCoach(p)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-left transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(p.id)} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                        {initials(p)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{fullName(p)}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.email}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 shrink-0 px-2 py-1 bg-slate-100 rounded-md">
                        {p.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
