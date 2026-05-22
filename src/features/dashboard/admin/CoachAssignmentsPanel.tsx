'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  IoPeopleOutline, IoAddOutline, IoCloseOutline, IoSearchOutline,
  IoPersonAddOutline, IoChevronDownOutline, IoChevronForwardOutline,
  IoTrashOutline, IoSwapHorizontalOutline,
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

export default function CoachAssignmentsPanel({ courseId, courseTitle, linkedCycleIds }: Props) {
  const [coaches, setCoaches] = useState<ProfileLite[]>([]);
  const [students, setStudents] = useState<ProfileLite[]>([]);
  const [assignments, setAssignments] = useState<CoachAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCoach, setExpandedCoach] = useState<string | null>(null);

  // Modal: promote a profile to coach
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteQuery, setPromoteQuery] = useState('');
  const [promoteResults, setPromoteResults] = useState<ProfileLite[]>([]);
  const [promoteSearching, setPromoteSearching] = useState(false);

  // Modal: assign a student to a coach
  const [assignFor, setAssignFor] = useState<ProfileLite | null>(null);

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

      // Deduplicate students (same profile can have multiple enrollments).
      const seen = new Set<string>();
      const enrolledStudents: ProfileLite[] = [];
      for (const e of studentsRes.data as any[]) {
        const p = e.profile;
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          enrolledStudents.push(p);
        }
      }
      setStudents(enrolledStudents);
      setAssignments(assignmentsRes.data);
    } catch (err: any) {
      console.error('[CoachAssignmentsPanel] fetch failed', err);
      toast.error('No se pudieron cargar los coaches');
    } finally {
      setLoading(false);
    }
  }, [linkedCycleIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Promote modal: live search for any profile ──────────────────────────
  useEffect(() => {
    if (!promoteOpen) return;
    const q = promoteQuery.trim();
    if (q.length < 2) {
      setPromoteResults([]);
      return;
    }
    setPromoteSearching(true);
    const timer = setTimeout(async () => {
      try {
        // Postgrest "or" filter: first_name OR last_name OR email matches.
        const safe = q.replace(/[%,]/g, '');
        const { data } = await restSelect<ProfileLite>('profiles', {
          columns: 'id,first_name,last_name,email,role',
          filters: {
            is_deleted: 'eq.false',
            or: `(first_name.ilike.*${safe}*,last_name.ilike.*${safe}*,email.ilike.*${safe}*)`,
          },
          limit: 8,
        });
        // Hide profiles that are already coaches and staff (promoting an admin
        // would silently demote them, that's a footgun).
        setPromoteResults(data.filter(p => !isReviewerRole(p.role ?? '')));
      } catch (err) {
        console.error('[CoachAssignmentsPanel] search failed', err);
      } finally {
        setPromoteSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [promoteQuery, promoteOpen]);

  const promoteToCoach = async (profile: ProfileLite) => {
    try {
      await restUpdate('profiles', { role: 'coach' }, { id: `eq.${profile.id}` });
      toast.success(`${fullName(profile)} es ahora coach`);
      setPromoteOpen(false);
      setPromoteQuery('');
      setPromoteResults([]);
      fetchAll();
    } catch (err: any) {
      toast.error('No se pudo asignar el rol: ' + err.message);
    }
  };

  const demoteCoach = async (coach: ProfileLite) => {
    const hasAssignments = assignments.some(a => a.coach_profile_id === coach.id);
    const confirmed = window.confirm(
      hasAssignments
        ? `${fullName(coach)} tiene alumnos asignados. Si lo quitás como coach, esas asignaciones se borran. ¿Continuar?`
        : `Quitar el rol de coach a ${fullName(coach)}?`
    );
    if (!confirmed) return;
    try {
      // Remove their assignments first (FK CASCADE would do it but explicit is clearer).
      if (hasAssignments) {
        await restDelete('coach_assignments', { coach_profile_id: `eq.${coach.id}` });
      }
      await restUpdate('profiles', { role: 'student' }, { id: `eq.${coach.id}` });
      toast.success(`${fullName(coach)} vuelve a ser alumno`);
      fetchAll();
    } catch (err: any) {
      toast.error('No se pudo quitar el rol: ' + err.message);
    }
  };

  const assignStudent = async (coach: ProfileLite, student: ProfileLite) => {
    try {
      await restInsert(
        'coach_assignments',
        {
          coach_profile_id: coach.id,
          student_profile_id: student.id,
          cycle_id: null, // global within the coach scope; per-cycle scoping is a later iteration
        },
        { returning: 'minimal' }
      );
      toast.success(`${fullName(student)} → ${fullName(coach)}`);
      setAssignFor(null);
      fetchAll();
    } catch (err: any) {
      if (String(err.message).includes('coach_assignments_coach_profile')) {
        toast.error('Ese alumno ya está asignado a este coach');
      } else {
        toast.error('No se pudo asignar: ' + err.message);
      }
    }
  };

  const unassignStudent = async (assignmentId: string) => {
    try {
      await restDelete('coach_assignments', { id: `eq.${assignmentId}` });
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast.success('Asignación quitada');
    } catch (err: any) {
      toast.error('No se pudo quitar: ' + err.message);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────
  const studentById = new Map(students.map(s => [s.id, s]));

  // For each coach, the students assigned to them that are enrolled in this course.
  const studentsByCoach = new Map<string, ProfileLite[]>();
  for (const a of assignments) {
    const student = studentById.get(a.student_profile_id);
    if (!student) continue; // assignment exists but student isn't in this course
    const list = studentsByCoach.get(a.coach_profile_id) ?? [];
    list.push(student);
    studentsByCoach.set(a.coach_profile_id, list);
  }

  const assignmentByStudent = new Map<string, CoachAssignmentRow>();
  for (const a of assignments) assignmentByStudent.set(a.student_profile_id, a);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-start justify-between mb-3 gap-2">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <IoPeopleOutline size={16} className="text-[#00A9CE]" /> Equipo de coaches
        </h3>
        <button
          onClick={() => setPromoteOpen(true)}
          className="flex items-center gap-1 text-xs font-bold text-[#00A9CE] hover:underline shrink-0"
        >
          <IoPersonAddOutline size={14} /> Nuevo coach
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Quién acompaña a los alumnos de este programa. Los coaches ven entregas, devuelven trabajos y reciben tu actividad en la bandeja.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-[#00A9CE] rounded-full animate-spin" />
        </div>
      ) : coaches.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
          <p className="text-xs text-slate-500 italic mb-2">Todavía no hay coaches.</p>
          <button
            onClick={() => setPromoteOpen(true)}
            className="text-xs font-bold text-[#00A9CE] hover:underline"
          >
            Designar el primero →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {coaches.map(c => {
            const assignedStudents = studentsByCoach.get(c.id) ?? [];
            const isOpen = expandedCoach === c.id;
            return (
              <div key={c.id} className="border border-slate-100 rounded-lg bg-slate-50/50 overflow-hidden">
                <button
                  onClick={() => setExpandedCoach(isOpen ? null : c.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-100/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00A9CE] to-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {initials(c)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{fullName(c)}</p>
                    <p className="text-[10px] text-slate-500">
                      {assignedStudents.length === 0
                        ? 'Sin alumnos'
                        : `${assignedStudents.length} alumno${assignedStudents.length !== 1 ? 's' : ''} en este programa`}
                    </p>
                  </div>
                  {isOpen ? <IoChevronDownOutline size={14} className="text-slate-400" /> : <IoChevronForwardOutline size={14} className="text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 border-t border-slate-100 bg-white">
                    {assignedStudents.length === 0 ? (
                      <p className="text-xs text-slate-400 italic pt-2 pb-1">Sin alumnos en este programa todavía.</p>
                    ) : (
                      <div className="space-y-1 pt-2">
                        {assignedStudents.map(s => {
                          const a = assignmentByStudent.get(s.id);
                          return (
                            <div key={s.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 group">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {initials(s)}
                              </div>
                              <span className="flex-1 text-xs font-medium text-slate-700 truncate">{fullName(s)}</span>
                              <button
                                onClick={() => a && unassignStudent(a.id)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Quitar asignación"
                              >
                                <IoCloseOutline size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setAssignFor(c)}
                        className="flex items-center gap-1 text-xs font-bold text-[#00A9CE] hover:underline"
                      >
                        <IoAddOutline size={14} /> Asignar alumno
                      </button>
                      <button
                        onClick={() => demoteCoach(c)}
                        className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-red-500 uppercase tracking-wider"
                      >
                        <IoSwapHorizontalOutline size={12} /> Quitar coach
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Promote modal ──────────────────────────────────────────────────── */}
      {promoteOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPromoteOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-900">Designar nuevo coach</h3>
              <button onClick={() => setPromoteOpen(false)} className="text-slate-400 hover:text-slate-700">
                <IoCloseOutline size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Buscá una persona ya registrada en HOME. Pasará a tener rol de coach y podrá ser asignada a alumnos.
            </p>

            <div className="relative mb-3">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                autoFocus
                value={promoteQuery}
                onChange={e => setPromoteQuery(e.target.value)}
                placeholder="Nombre o email…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#00A9CE]/30 focus:border-[#00A9CE] outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              {promoteQuery.trim().length < 2 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Escribí al menos 2 letras…</p>
              ) : promoteSearching ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Buscando…</p>
              ) : promoteResults.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Sin resultados.</p>
              ) : (
                <div className="space-y-1">
                  {promoteResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => promoteToCoach(p)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {initials(p)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{fullName(p)}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.email}</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
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

      {/* ── Assign student modal ───────────────────────────────────────────── */}
      {assignFor && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setAssignFor(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 pb-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-900">Asignar alumno</h3>
                <button onClick={() => setAssignFor(null)} className="text-slate-400 hover:text-slate-700">
                  <IoCloseOutline size={20} />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Coach: <span className="font-bold text-slate-700">{fullName(assignFor)}</span>
                <span className="block">Programa: <span className="font-bold text-slate-700">{courseTitle}</span></span>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {students.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  No hay alumnos inscriptos en los ciclos vinculados a este programa.
                </p>
              ) : (
                <div className="space-y-1">
                  {students.map(s => {
                    const existing = assignmentByStudent.get(s.id);
                    const isAssignedHere = existing?.coach_profile_id === assignFor.id;
                    const isAssignedElsewhere = !!existing && !isAssignedHere;
                    const otherCoach = isAssignedElsewhere
                      ? coaches.find(c => c.id === existing!.coach_profile_id)
                      : null;
                    return (
                      <button
                        key={s.id}
                        onClick={() => !isAssignedHere && assignStudent(assignFor, s)}
                        disabled={isAssignedHere}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-left ${
                          isAssignedHere
                            ? 'bg-emerald-50/60 cursor-not-allowed'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {initials(s)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{fullName(s)}</p>
                          <p className="text-[10px] text-slate-500 truncate">{s.email}</p>
                        </div>
                        {isAssignedHere ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Asignado</span>
                        ) : isAssignedElsewhere ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 truncate max-w-[120px]">
                            con {otherCoach ? fullName(otherCoach) : 'otro coach'}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
