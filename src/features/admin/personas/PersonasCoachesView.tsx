'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  IoPersonAddOutline, IoSearchOutline, IoCloseOutline, IoSwapHorizontalOutline,
  IoPeopleOutline, IoCheckmarkOutline, IoTrashOutline, IoMailOutline,
} from 'react-icons/io5';
import { supabase } from '../../../services/supabaseClient';
import { restSelect, restInsert, restUpdate, restDelete } from '../../../services/supabaseRest';
import { isReviewerRole } from '../../../services/roleService';
import type { PersonaCoach } from './types';

type ViewMode = 'table' | 'grid';

interface Props {
  viewMode: ViewMode;
  searchTerm: string;
}

interface ProfileLite {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone?: string | null;
  role: string;
  avatar_url?: string | null;
}

interface AssignmentRow {
  id: string;
  coach_profile_id: string;
  student_profile_id: string;
  cycle_id: string | null;
}

const fullName = (p: ProfileLite) =>
  `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || 'Sin nombre';

const initialsOf = (p: { firstName?: string; lastName?: string; email?: string }) => {
  const fn = (p.firstName ?? '').trim();
  const ln = (p.lastName ?? '').trim();
  if (fn || ln) return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase() || '·';
  return (p.email ?? '·')[0]?.toUpperCase() ?? '·';
};

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

export default function PersonasCoachesView({ viewMode, searchTerm }: Props) {
  const [coaches, setCoaches] = useState<PersonaCoach[]>([]);
  const [assignmentsByCoach, setAssignmentsByCoach] = useState<Record<string, AssignmentRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<PersonaCoach | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [coachesRes, assignmentsRes] = await Promise.all([
        restSelect<ProfileLite>('profiles', {
          columns: 'id,user_id,first_name,last_name,email,phone,role,avatar_url',
          filters: { role: 'eq.coach', is_deleted: 'eq.false' },
          order: 'first_name.asc',
        }),
        restSelect<AssignmentRow>('coach_assignments', {
          columns: 'id,coach_profile_id,student_profile_id,cycle_id',
        }),
      ]);

      const grouped: Record<string, AssignmentRow[]> = {};
      for (const a of assignmentsRes.data) {
        (grouped[a.coach_profile_id] ??= []).push(a);
      }

      setAssignmentsByCoach(grouped);
      setCoaches(coachesRes.data.map(p => ({
        id: p.id,
        user_id: p.user_id,
        firstName: p.first_name || '',
        lastName: p.last_name || '',
        name: fullName(p),
        email: p.email || '',
        phone: p.phone || '',
        avatarUrl: p.avatar_url || null,
        assignedStudentCount: (grouped[p.id] || []).length,
      })));
    } catch (err) {
      console.error('[Coaches] fetch failed', err);
      toast.error('No se pudieron cargar los coaches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const channelName = 'admin_coaches_view';
    supabase.getChannels().forEach(ch => {
      if (ch.topic.includes(channelName)) supabase.removeChannel(ch);
    });
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_assignments' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return coaches;
    return coaches.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  }, [coaches, searchTerm]);

  const demoteCoach = async (coach: PersonaCoach) => {
    const hasAssignments = (assignmentsByCoach[coach.id] || []).length > 0;
    if (!window.confirm(hasAssignments
      ? `${coach.name} tiene ${coach.assignedStudentCount} alumno(s) asignado(s). ¿Continuar?`
      : `Quitar el rol de coach a ${coach.name}?`)) return;
    try {
      if (hasAssignments) await restDelete('coach_assignments', { coach_profile_id: `eq.${coach.id}` });
      await restUpdate('profiles', { role: 'student' }, { id: `eq.${coach.id}` });
      toast.success(`${coach.name} vuelve a ser alumno`);
      setSelectedCoach(null);
      fetchAll();
    } catch (err: any) {
      toast.error('No se pudo quitar el rol: ' + err.message);
    }
  };

  return (
    <>
      <div className="formal-card overflow-hidden animate-fade-in-up h-full flex flex-col">
        {/* Toolbar */}
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between bg-white gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <IoPeopleOutline size={18} /> Equipo de coaches
              <span className="ml-1 text-xs font-bold text-slate-400">({filtered.length})</span>
            </h3>
          </div>
          <button
            onClick={() => setPromoteOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#00A9CE] hover:bg-[#0099BB] px-3 py-2 rounded-md transition-colors"
          >
            <IoPersonAddOutline size={14} /> Añadir coach
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading && coaches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Cargando coaches...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic text-sm">
              No hay coaches. Usá &quot;Añadir coach&quot; para promover un alumno existente.
            </div>
          ) : viewMode === 'table' ? (
            <table className="formal-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Coach</th>
                  <th className="text-center">Alumnos asignados</th>
                  <th className="text-center">Acceso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedCoach(c)}>
                    <td>
                      <div className="flex items-center gap-3">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(c.id)} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                            {initialsOf(c)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {c.assignedStudentCount}
                      </span>
                    </td>
                    <td className="text-center">
                      {c.user_id ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">✓ Acceso</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Sin acceso</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); demoteCoach(c); }}
                        className="text-[10px] font-bold text-rose-500 hover:underline uppercase tracking-wider"
                      >
                        Quitar rol
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCoach(c)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-[#00A9CE]/40 hover:shadow-md transition-all p-4 flex flex-col gap-3 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor(c.id)} text-white text-sm font-bold flex items-center justify-center shrink-0`}>
                        {initialsOf(c)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
                      <p className="text-[10px] font-medium text-slate-400 truncate uppercase tracking-wide">{c.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                      <IoPeopleOutline size={12} /> {c.assignedStudentCount} alumno{c.assignedStudentCount !== 1 ? 's' : ''}
                    </span>
                    {c.user_id ? (
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">✓ acceso</span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">sin acceso</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {promoteOpen && createPortal(
        <PromoteCoachModal
          onClose={() => setPromoteOpen(false)}
          onPromoted={() => { setPromoteOpen(false); fetchAll(); }}
        />,
        document.body
      )}

      {selectedCoach && createPortal(
        <CoachDetailModal
          coach={selectedCoach}
          assignments={assignmentsByCoach[selectedCoach.id] || []}
          onClose={() => setSelectedCoach(null)}
          onChanged={fetchAll}
          onDemote={() => demoteCoach(selectedCoach)}
        />,
        document.body
      )}
    </>
  );
}

// ─── Promote modal ────────────────────────────────────────────────────────────

function PromoteCoachModal({ onClose, onPromoted }: { onClose: () => void; onPromoted: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const safe = q.replace(/[%,]/g, '');
        const { data } = await restSelect<ProfileLite>('profiles', {
          columns: 'id,user_id,first_name,last_name,email,role,avatar_url',
          filters: {
            is_deleted: 'eq.false',
            or: `(first_name.ilike.*${safe}*,last_name.ilike.*${safe}*,email.ilike.*${safe}*)`,
          },
          limit: 12,
        });
        setResults(data.filter(p => !isReviewerRole(p.role ?? '')));
      } catch {/* silent */} finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const promote = async (p: ProfileLite) => {
    setPromoting(p.id);
    try {
      await restUpdate('profiles', { role: 'coach' }, { id: `eq.${p.id}` });
      toast.success(`${fullName(p)} es ahora coach`);
      onPromoted();
    } catch (err: any) {
      toast.error('No se pudo promover: ' + err.message);
    } finally {
      setPromoting(null);
    }
  };

  return (
    <div className="full-screen-modal-overlay z-[80]" onClick={onClose}>
      <div className="formal-modal max-w-lg w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <IoSwapHorizontalOutline size={18} /> Promover a coach
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar">
            <IoCloseOutline size={22} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Buscá un alumno existente para asignarle el rol de coach. Vas a poder asignarle alumnos después.
        </p>

        <div className="relative mb-4">
          <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Nombre o email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30"
          />
        </div>

        <div className="max-h-80 overflow-y-auto -mx-2 px-2">
          {query.trim().length < 2 ? (
            <p className="text-center text-xs text-slate-400 py-8">Escribí al menos 2 caracteres</p>
          ) : searching ? (
            <p className="text-center text-xs text-slate-400 py-8">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">Sin resultados</p>
          ) : (
            <ul className="space-y-1.5">
              {results.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => promote(p)}
                    disabled={promoting === p.id}
                    className="w-full flex items-center gap-3 p-3 rounded-md bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors disabled:opacity-50"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={fullName(p)} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarColor(p.id)} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                        {initialsOf({ firstName: p.first_name ?? '', lastName: p.last_name ?? '', email: p.email ?? '' })}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-slate-800 truncate">{fullName(p)}</p>
                      <p className="text-[10px] text-slate-500 truncate">{p.email}</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {promoting === p.id ? '...' : 'Promover'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Coach detail modal ───────────────────────────────────────────────────────

function CoachDetailModal({
  coach, assignments, onClose, onChanged, onDemote,
}: {
  coach: PersonaCoach;
  assignments: AssignmentRow[];
  onClose: () => void;
  onChanged: () => void;
  onDemote: () => void;
}) {
  const [students, setStudents] = useState<ProfileLite[]>([]);
  const [allStudents, setAllStudents] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const assignedIds = assignments.map(a => a.student_profile_id);
        const [assignedStudentsRes, allRes] = await Promise.all([
          assignedIds.length > 0
            ? restSelect<ProfileLite>('profiles', {
                columns: 'id,user_id,first_name,last_name,email,role,avatar_url',
                filters: { id: `in.(${assignedIds.join(',')})` },
              })
            : Promise.resolve({ data: [], count: null }),
          restSelect<ProfileLite>('profiles', {
            columns: 'id,user_id,first_name,last_name,email,role,avatar_url',
            filters: { role: 'eq.student', is_deleted: 'eq.false' },
            order: 'first_name.asc',
            limit: 500,
          }),
        ]);
        if (cancelled) return;
        setStudents(assignedStudentsRes.data);
        setAllStudents(allRes.data);
      } catch (err) {
        toast.error('No se pudo cargar el detalle');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [coach.id, assignments]);

  const assignedSet = useMemo(() => new Set(assignments.map(a => a.student_profile_id)), [assignments]);
  const candidates = useMemo(() => allStudents.filter(s => !assignedSet.has(s.id)), [allStudents, assignedSet]);

  const assignStudent = async (student: ProfileLite) => {
    try {
      await restInsert('coach_assignments', {
        coach_profile_id: coach.id,
        student_profile_id: student.id,
        cycle_id: null,
      }, { returning: 'minimal' });
      toast.success(`${fullName(student)} → ${coach.name}`);
      onChanged();
      setAssignOpen(false);
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
      toast.success('Asignación quitada');
      onChanged();
    } catch (err: any) {
      toast.error('No se pudo quitar: ' + err.message);
    }
  };

  return (
    <div className="full-screen-modal-overlay z-[80]" onClick={onClose}>
      <div className="formal-modal max-w-2xl w-full max-h-[88vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          {coach.avatarUrl ? (
            <img src={coach.avatarUrl} alt={coach.name} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(coach.id)} text-white text-base font-bold flex items-center justify-center shrink-0`}>
              {initialsOf(coach)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 truncate">{coach.name}</h3>
            <p className="text-sm text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
              <IoMailOutline size={13} /> {coach.email}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Coach · {coach.assignedStudentCount} alumno{coach.assignedStudentCount !== 1 ? 's' : ''} asignado{coach.assignedStudentCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0" aria-label="Cerrar">
            <IoCloseOutline size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alumnos asignados</h4>
            <button
              onClick={() => setAssignOpen(true)}
              className="text-xs font-bold text-[#00A9CE] hover:underline flex items-center gap-1"
            >
              <IoPersonAddOutline size={14} /> Asignar alumno
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-slate-200 border-t-[#00A9CE] rounded-full animate-spin" /></div>
          ) : students.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-8">Sin alumnos asignados todavía.</p>
          ) : (
            <ul className="space-y-2">
              {students.map(s => {
                const assignment = assignments.find(a => a.student_profile_id === s.id);
                if (!assignment) return null;
                return (
                  <li key={s.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt={fullName(s)} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarColor(s.id)} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                        {initialsOf({ firstName: s.first_name ?? '', lastName: s.last_name ?? '', email: s.email ?? '' })}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{fullName(s)}</p>
                      <p className="text-[10px] text-slate-500 truncate">{s.email}</p>
                    </div>
                    <button
                      onClick={() => unassignStudent(assignment.id)}
                      className="text-rose-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50"
                      title="Quitar asignación"
                    >
                      <IoTrashOutline size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
          <button
            onClick={onDemote}
            className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-md uppercase tracking-wider"
          >
            Quitar rol de coach
          </button>
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-md">
            Cerrar
          </button>
        </div>
      </div>

      {assignOpen && (
        <div className="full-screen-modal-overlay z-[90]" onClick={() => setAssignOpen(false)}>
          <div className="formal-modal max-w-md w-full max-h-[80vh] flex flex-col p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Asignar alumno a {coach.name}</h3>
              <button onClick={() => setAssignOpen(false)} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar">
                <IoCloseOutline size={20} />
              </button>
            </div>
            <CandidatesList candidates={candidates} onPick={assignStudent} />
          </div>
        </div>
      )}
    </div>
  );
}

function CandidatesList({ candidates, onPick }: { candidates: ProfileLite[]; onPick: (p: ProfileLite) => void }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return candidates.slice(0, 50);
    return candidates.filter(p => {
      const hay = `${p.first_name || ''} ${p.last_name || ''} ${p.email || ''}`.toLowerCase();
      return hay.includes(term);
    }).slice(0, 50);
  }, [candidates, q]);

  return (
    <>
      <div className="relative mb-3">
        <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          autoFocus
          placeholder="Filtrar..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30"
        />
      </div>
      <div className="flex-1 overflow-y-auto -mx-2 px-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-8">No hay alumnos disponibles.</p>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map(p => (
              <li key={p.id}>
                <button
                  onClick={() => onPick(p)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-md bg-slate-50 hover:bg-blue-50 transition-colors text-left"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={fullName(p)} className="w-7 h-7 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${avatarColor(p.id)} text-white text-[9px] font-bold flex items-center justify-center shrink-0`}>
                      {initialsOf({ firstName: p.first_name ?? '', lastName: p.last_name ?? '', email: p.email ?? '' })}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{fullName(p)}</p>
                    <p className="text-[10px] text-slate-500 truncate">{p.email}</p>
                  </div>
                  <IoCheckmarkOutline size={16} className="text-[#00A9CE]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
