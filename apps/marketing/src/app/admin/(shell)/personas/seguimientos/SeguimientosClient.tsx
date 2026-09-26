'use client';

// Tablero de seguimientos (lo que era la hoja "BACKS PL"): a quién ofrecerle el
// próximo programa y en qué etapa está. Una columna por etapa, una tarjeta por
// persona con su recorrido (Inicial / Avanzado / PL), contacto, encargada y
// próxima fecha. La etapa se cambia desde la tarjeta; los comentarios del
// proceso quedan en profile_notes, así también se ven en la ficha.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  IoArrowBackOutline, IoLogoWhatsapp, IoAddOutline, IoCloseOutline, IoSearchOutline,
  IoCalendarOutline, IoChevronDownOutline, IoChevronUpOutline,
} from 'react-icons/io5';
import { restSelect, restInsert, restUpdate } from '@home/services/supabaseRest';
import { getMyActorInfo } from '@home/services/activityEvents';

const STAGES = [
  { key: 'contactar', label: 'Contactar', color: 'border-t-slate-400' },
  { key: 'sin_respuesta', label: 'Sin respuesta', color: 'border-t-amber-400' },
  { key: 'duda', label: 'Tiene dudas', color: 'border-t-violet-400' },
  { key: 'si', label: 'Dijo que sí', color: 'border-t-emerald-500' },
  { key: 'no', label: 'Dijo que no', color: 'border-t-rose-400' },
  { key: 'no_elegible', label: 'No elegible', color: 'border-t-slate-300' },
] as const;

const TARGETS = [
  { key: 'avanzado', label: 'Avanzado' },
  { key: 'pl', label: 'Plan Líder' },
  { key: 'formacion', label: 'Formación' },
];

const JOURNEY: { type: string; label: string }[] = [
  { type: 'initial', label: 'Inicial' },
  { type: 'advanced', label: 'Avanzado' },
  { type: 'plan_lider', label: 'PL' },
];

type Enrollment = { status: string | null; cycle: { name: string; type: string } | null };

interface FollowUp {
  id: string;
  target: string;
  status: string;
  owner_name: string | null;
  next_contact_at: string | null;
  notes: string | null;
  updated_at: string;
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    enrollments: Enrollment[];
  } | null;
}

interface Note { id: string; body: string; created_at: string }

const fullName = (p: { first_name: string | null; last_name: string | null } | null) =>
  [p?.first_name, p?.last_name].filter(Boolean).join(' ') || '(sin nombre)';
const today = () => new Date().toISOString().slice(0, 10);
const inputCls = 'w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30';

/** Estado de la persona en cada programa: hecho, cursando o nada. */
function journey(enrollments: Enrollment[]) {
  return JOURNEY.map(j => {
    const mine = enrollments.filter(e => e.cycle?.type === j.type && e.status !== 'dropped');
    const done = mine.some(e => e.status === 'completed' || e.status === 'graduated');
    const state: 'done' | 'doing' | 'none' = done ? 'done' : mine.length ? 'doing' : 'none';
    return { ...j, state };
  });
}

export default function SeguimientosClient() {
  const [items, setItems] = useState<FollowUp[] | null>(null);
  const [target, setTarget] = useState('pl');
  const [owner, setOwner] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const { data } = await restSelect<FollowUp>('follow_ups', {
        columns:
          'id,target,status,owner_name,next_contact_at,notes,updated_at,' +
          'profile:profiles!follow_ups_profile_id_fkey(id,first_name,last_name,phone,email,' +
          'enrollments:enrollments!enrollments_user_id_fkey(status,cycle:cycles(name,type)))',
        order: 'next_contact_at.asc.nullslast,updated_at.desc',
        limit: 2000,
      });
      setItems(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron cargar los seguimientos.');
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  const owners = useMemo(
    () => [...new Set((items ?? []).map(i => i.owner_name?.trim()).filter(Boolean) as string[])].sort(),
    [items],
  );

  const visible = (items ?? []).filter(i =>
    i.target === target &&
    (!owner || i.owner_name?.trim() === owner) &&
    (!search.trim() || fullName(i.profile).toLowerCase().includes(search.trim().toLowerCase())),
  );

  const patch = async (id: string, changes: Partial<FollowUp>) => {
    setItems(prev => prev?.map(i => (i.id === id ? { ...i, ...changes } : i)) ?? null);
    try {
      await restUpdate('follow_ups', { ...changes, updated_at: new Date().toISOString() }, { id: `eq.${id}` });
    } catch (e) {
      toast.error('No se pudo guardar el cambio.');
      load();
    }
  };

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      <Link href="/admin/personas" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900">
        <IoArrowBackOutline size={16} /> Volver a Personas
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Seguimientos</h1>
          <p className="text-xs text-slate-400 mt-0.5">A quién ofrecerle el próximo programa y en qué etapa está cada persona.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold rounded-lg"
        >
          <IoAddOutline size={15} /> Agregar persona
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-slate-100 rounded-lg p-1">
          {TARGETS.map(t => (
            <button
              key={t.key}
              onClick={() => setTarget(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${target === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label} <span className="text-slate-400">{(items ?? []).filter(i => i.target === t.key).length}</span>
            </button>
          ))}
        </div>
        <select value={owner} onChange={e => setOwner(e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white">
          <option value="">Todas las encargadas</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="relative">
          <IoSearchOutline size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar persona" className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white" />
        </div>
      </div>

      {adding && (
        <AddFollowUp
          target={target}
          onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); load(); }}
        />
      )}

      {items === null ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-100 border-t-[#00A9CE] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const cards = visible.filter(i => i.status === stage.key);
            return (
              <div key={stage.key} className={`w-72 shrink-0 bg-slate-50 rounded-xl border border-slate-200 border-t-4 ${stage.color}`}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-600">{stage.label}</p>
                  <span className="text-xs font-bold text-slate-400">{cards.length}</span>
                </div>
                <div className="px-2 pb-2 space-y-2 max-h-[70vh] overflow-y-auto">
                  {cards.length === 0 && <p className="text-[11px] text-slate-300 text-center py-6">Nadie en esta etapa</p>}
                  {cards.map(c => <Card key={c.id} item={c} onPatch={changes => patch(c.id, changes)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Card({ item, onPatch }: { item: FollowUp; onPatch: (c: Partial<FollowUp>) => void }) {
  const [open, setOpen] = useState(false);
  const p = item.profile;
  const phone = p?.phone?.replace(/\D/g, '') ?? '';
  const overdue = item.next_contact_at && item.next_contact_at < today();

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setOpen(o => !o)} className="text-left min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{fullName(p)}</p>
        </button>
        <button onClick={() => setOpen(o => !o)} className="text-slate-300 hover:text-slate-600 shrink-0" aria-label={open ? 'Cerrar' : 'Abrir'}>
          {open ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
        </button>
      </div>

      {/* Recorrido */}
      <div className="flex gap-1">
        {journey(p?.enrollments ?? []).map(j => (
          <span
            key={j.type}
            title={j.state === 'done' ? 'Hecho' : j.state === 'doing' ? 'Cursando' : 'No hizo'}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              j.state === 'done' ? 'bg-emerald-100 text-emerald-700' : j.state === 'doing' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-300'
            }`}
          >
            {j.label}{j.state === 'done' ? ' ✓' : ''}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        {phone && (
          <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 font-bold hover:underline">
            <IoLogoWhatsapp size={12} /> {p?.phone}
          </a>
        )}
        {item.owner_name && <span>👤 {item.owner_name}</span>}
        {item.next_contact_at && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-rose-600 font-bold' : ''}`}>
            <IoCalendarOutline size={11} /> {new Date(`${item.next_contact_at}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {item.notes && !open && <p className="text-[11px] text-slate-500 line-clamp-2">{item.notes}</p>}

      <select
        value={item.status}
        onChange={e => onPatch({ status: e.target.value })}
        className={inputCls}
        aria-label="Etapa"
      >
        {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>

      {open && <CardDetail item={item} onPatch={onPatch} />}
    </div>
  );
}

function CardDetail({ item, onPatch }: { item: FollowUp; onPatch: (c: Partial<FollowUp>) => void }) {
  const [ownerName, setOwnerName] = useState(item.owner_name ?? '');
  const [next, setNext] = useState(item.next_contact_at ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [log, setLog] = useState<Note[] | null>(null);
  const [newNote, setNewNote] = useState('');
  const profileId = item.profile?.id;

  useEffect(() => {
    if (!profileId) return;
    restSelect<Note>('profile_notes', {
      columns: 'id,body,created_at', filters: { profile_id: `eq.${profileId}` }, order: 'created_at.desc', limit: 20,
    }).then(({ data }) => setLog(data)).catch(() => setLog([]));
  }, [profileId]);

  const dirty = ownerName !== (item.owner_name ?? '') || next !== (item.next_contact_at ?? '') || notes !== (item.notes ?? '');

  const addNote = async () => {
    const body = newNote.trim();
    if (!body || !profileId) return;
    const actor = await getMyActorInfo();
    const created = await restInsert<Note>('profile_notes', {
      profile_id: profileId, body, author_profile_id: actor?.profileId ?? null,
    }, { returning: 'representation' }).catch(() => null);
    if (!created) { toast.error('No se pudo guardar el comentario.'); return; }
    setLog(prev => [created, ...(prev ?? [])]);
    setNewNote('');
  };

  return (
    <div className="border-t border-slate-100 pt-2 space-y-2">
      {item.profile?.email && <p className="text-[11px] text-slate-500 break-all">{item.profile.email}</p>}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] font-bold text-slate-400">Encargada
          <input value={ownerName} onChange={e => setOwnerName(e.target.value)} className={inputCls} />
        </label>
        <label className="text-[10px] font-bold text-slate-400">Próximo contacto
          <input type="date" value={next} onChange={e => setNext(e.target.value)} className={inputCls} />
        </label>
      </div>
      <label className="block text-[10px] font-bold text-slate-400">En qué está
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} />
      </label>
      {dirty && (
        <button
          onClick={() => onPatch({ owner_name: ownerName.trim() || null, next_contact_at: next || null, notes: notes.trim() || null })}
          className="w-full py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg"
        >
          Guardar
        </button>
      )}

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">Comentarios del proceso</p>
      <div className="flex gap-1.5">
        <input
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
          placeholder="Ej. lo llamé, pide que le escriba en marzo"
          className={inputCls}
        />
        <button onClick={addNote} className="px-2.5 bg-[#00A9CE] text-white text-[11px] font-bold rounded-lg">+</button>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {log === null ? (
          <p className="text-[11px] text-slate-300">Cargando…</p>
        ) : log.length === 0 ? (
          <p className="text-[11px] text-slate-300">Sin comentarios todavía.</p>
        ) : log.map(n => (
          <div key={n.id} className="text-[11px] bg-slate-50 rounded px-2 py-1">
            <span className="text-slate-400">{new Date(n.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })} · </span>
            <span className="text-slate-600">{n.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddFollowUp({ target, onClose, onAdded }: { target: string; onClose: () => void; onAdded: () => void }) {
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null }[]>([]);
  const [forTarget, setForTarget] = useState(target);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 3) { setHits([]); return; }
    const t = setTimeout(async () => {
      const p = `*${term.replace(/[(),*]/g, ' ')}*`;
      const { data } = await restSelect<any>('profiles', {
        columns: 'id,first_name,last_name,email',
        filters: { is_deleted: 'eq.false', or: `(first_name.ilike.${p},last_name.ilike.${p},email.ilike.${p})` },
        limit: 8,
      }).catch(() => ({ data: [] }));
      setHits(data);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const add = async (profileId: string) => {
    try {
      await restInsert('follow_ups', { profile_id: profileId, target: forTarget, status: 'contactar' }, { returning: 'minimal' });
      toast.success('Agregada al seguimiento');
      onAdded();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      toast.error(/duplicate|unique/i.test(msg) ? 'Esa persona ya está en el seguimiento de ese programa.' : 'No se pudo agregar.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 max-w-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">Agregar al seguimiento</p>
        <button onClick={onClose} aria-label="Cerrar"><IoCloseOutline size={18} className="text-slate-400" /></button>
      </div>
      <div className="flex gap-2">
        <select value={forTarget} onChange={e => setForTarget(e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white">
          {TARGETS.map(t => <option key={t.key} value={t.key}>Para {t.label}</option>)}
        </select>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o email" className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg" />
      </div>
      {hits.map(h => (
        <button key={h.id} onClick={() => add(h.id)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-100">
          <span className="block text-sm font-bold text-slate-700">{fullName(h)}</span>
          <span className="block text-[11px] text-slate-400">{h.email || '—'}</span>
        </button>
      ))}
    </div>
  );
}
