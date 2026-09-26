'use client';

// Carga manual de una ficha en papel, una persona a la vez: la persona (o una
// que ya exista), su inscripción en una camada, el pago y un comentario
// interno. Pensado para quien pasa las fichas desde la compu: todo en una sola
// pantalla, de arriba hacia abajo, y al guardar queda lista para la siguiente.
//
// Mismo patrón que el importador: REST directo vía supabaseRest.ts.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  IoArrowBackOutline, IoSearchOutline, IoCloseOutline, IoCheckmarkCircle,
  IoPersonAddOutline, IoAlertCircleOutline,
} from 'react-icons/io5';
import { restSelect, restInsert, restUpsert } from '@home/services/supabaseRest';
import { getMyActorInfo } from '@home/services/activityEvents';
import { findExistingProfile, normalizeDni } from '@/src/features/admin/personas/import/applyRow';
import { CYCLE_TYPE_LABELS } from '@/src/features/admin/personas/types';

interface PersonHit { id: string; first_name: string | null; last_name: string | null; email: string | null; dni: string | null }
interface CycleOption { id: string; name: string; type: string; start_date: string }
type PayMode = 'total' | 'parcial' | 'nada';

const EMPTY_PERSON = {
  first_name: '', last_name: '', dni: '', phone: '', email: '', birth_date: '', referred_by_name: '',
  gender: '', address_street: '', address_city: '', current_occupation: '', instagram: '',
};
// Lo mismo que pregunta el formulario de inscripción (Google Form / papel).
const EMPTY_INTAKE = {
  dream1: '', dream2: '', dream3: '', context: '', qualities: '', daily_routine: '', energy_leaks: '', life_history: '',
};
const EMPTY_HEALTH = {
  chronic: '', treatment: 'ninguno', treatment_detail: '', consumption: '', medication: '', allergies: '',
  emergency_contact_name: '', emergency_contact_phone: '',
};
const INTAKE_FIELDS: [keyof typeof EMPTY_INTAKE, string][] = [
  ['dream1', 'Sueño 1: qué quiere y para qué'], ['dream2', 'Sueño 2'], ['dream3', 'Sueño 3'],
  ['context', 'Contexto actual (con quién vive, qué le gusta)'], ['qualities', 'Cualidades que lo/la diferencian'],
  ['daily_routine', 'Cómo es un día suyo'], ['energy_leaks', 'Fugas de energía'], ['life_history', 'Historia de vida / algo importante'],
];
const EMPTY_PROGRAM = { cycle_id: '', enrolled_by_name: '', channel: 'enrolador', agreed_amount: '', scholarship: 'none', deal_notes: '' };
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_PAYMENT = { mode: 'nada' as PayMode, amount: '', paid_at: today(), method: 'transfer', concept: 'inicial', notes: '' };

const formatMoney = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const toNumber = (v: string) => Number(v.replace(/\./g, '')) || 0;
const fullName = (p: PersonHit) => [p.first_name, p.last_name].filter(Boolean).join(' ') || '(sin nombre)';

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={className}><span className={labelCls}>{label}</span>{children}</label>;
}

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div>
        <p className="text-sm font-bold text-slate-900">{n}. {title}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function CargarFichaClient() {
  const [cycles, setCycles] = useState<CycleOption[]>([]);
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<PersonHit[]>([]);
  const [selected, setSelected] = useState<PersonHit | null>(null);
  const [person, setPerson] = useState(EMPTY_PERSON);
  const [intake, setIntake] = useState(EMPTY_INTAKE);
  const [health, setHealth] = useState(EMPTY_HEALTH);
  const [program, setProgram] = useState(EMPTY_PROGRAM);
  const [payment, setPayment] = useState(EMPTY_PAYMENT);
  const [comment, setComment] = useState('');
  const [duplicate, setDuplicate] = useState<PersonHit | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    restSelect<CycleOption>('cycles', {
      columns: 'id,name,type,start_date', filters: { is_deleted: 'eq.false' }, order: 'start_date.desc', limit: 500,
    }).then(({ data }) => setCycles(data)).catch(() => setCycles([]));
  }, []);

  // Búsqueda de personas que ya están cargadas (nombre, apellido, email o DNI).
  useEffect(() => {
    const term = search.trim();
    if (term.length < 3) { setHits([]); return; }
    const t = setTimeout(async () => {
      const p = `*${term.replace(/[(),*]/g, ' ')}*`;
      const { data } = await restSelect<PersonHit>('profiles', {
        columns: 'id,first_name,last_name,email,dni',
        filters: {
          is_deleted: 'eq.false',
          or: `(first_name.ilike.${p},last_name.ilike.${p},email.ilike.${p},dni.ilike.${p})`,
        },
        limit: 8,
      }).catch(() => ({ data: [] as PersonHit[] }));
      setHits(data);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const setP = (k: keyof typeof EMPTY_PERSON) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setPerson(s => ({ ...s, [k]: e.target.value }));
  const setI = (k: keyof typeof EMPTY_INTAKE) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setIntake(s => ({ ...s, [k]: e.target.value }));
  const setH = (k: keyof typeof EMPTY_HEALTH) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setHealth(s => ({ ...s, [k]: e.target.value }));
  const setG = (k: keyof typeof EMPTY_PROGRAM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setProgram(s => ({ ...s, [k]: k === 'agreed_amount' ? formatMoney(e.target.value) : e.target.value }));
  const setPay = (k: keyof typeof EMPTY_PAYMENT) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setPayment(s => ({ ...s, [k]: k === 'amount' ? formatMoney(e.target.value) : e.target.value }));

  const choosePayMode = (mode: PayMode) =>
    setPayment(s => ({ ...s, mode, amount: mode === 'total' ? program.agreed_amount : mode === 'nada' ? '' : s.amount }));

  const pick = (p: PersonHit) => { setSelected(p); setDuplicate(null); setSearch(''); setHits([]); };

  const reset = () => {
    setSelected(null); setPerson(EMPTY_PERSON); setIntake(EMPTY_INTAKE); setHealth(EMPTY_HEALTH); setProgram(EMPTY_PROGRAM);
    setPayment({ ...EMPTY_PAYMENT, paid_at: today() }); setComment(''); setDuplicate(null);
  };

  const handleSave = async () => {
    if (!selected && !person.first_name.trim()) { toast.error('Falta el nombre de la persona.'); return; }
    const payAmount = payment.mode === 'nada' ? 0 : toNumber(payment.amount);
    if (program.cycle_id && payment.mode !== 'nada' && payAmount <= 0) { toast.error('Poné el monto del pago.'); return; }

    setSaving(true);
    try {
      let profileId = selected?.id ?? null;
      if (!profileId) {
        // Antes de crear, que no esté ya cargada con el mismo email, DNI o nombre y apellido.
        const existing = await findExistingProfile(person);
        if (existing) {
          const { data } = await restSelect<PersonHit>('profiles', { columns: 'id,first_name,last_name,email,dni', filters: { id: `eq.${existing}` }, limit: 1 });
          setDuplicate(data[0] ?? null);
          return;
        }
        const created = await restInsert<{ id: string }>('profiles', {
          first_name: person.first_name.trim(),
          last_name: person.last_name.trim() || null,
          dni: normalizeDni(person.dni) || null,
          phone: person.phone.trim() || null,
          email: person.email.trim() || null,
          birth_date: person.birth_date || null,
          referred_by_name: person.referred_by_name.trim() || null,
          gender: person.gender || null,
          address_street: person.address_street.trim() || null,
          address_city: person.address_city.trim() || null,
          current_occupation: person.current_occupation.trim() || null,
          instagram: person.instagram.trim() || null,
          role: 'student',
        }, { returning: 'representation' });
        if (!created?.id) throw new Error('No se pudo crear la persona.');
        profileId = created.id;
      }

      // Ficha de inscripción: sueños e historia, y salud. Sólo lo que se completó.
      const intakeFilled = Object.fromEntries(Object.entries(intake).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
      if (Object.keys(intakeFilled).length) {
        await restUpsert('profile_intake', { profile_id: profileId, ...intakeFilled, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' });
      }
      const treatmentLabel = health.treatment === 'psicologico' ? 'Tratamiento psicológico' : health.treatment === 'psiquiatrico' ? 'Tratamiento psiquiátrico' : '';
      const details = [
        health.chronic.trim() && `Enfermedad crónica: ${health.chronic.trim()}`,
        treatmentLabel && `${treatmentLabel}${health.treatment_detail.trim() ? `: ${health.treatment_detail.trim()}` : ''}`,
        health.consumption.trim() && `Consumos: ${health.consumption.trim()}`,
      ].filter(Boolean).join('\n');
      if (details || health.medication.trim() || health.allergies.trim() || health.emergency_contact_name.trim() || health.emergency_contact_phone.trim()) {
        await restUpsert('medical_info', {
          user_id: profileId,
          under_treatment: health.treatment !== 'ninguno',
          treatment_details: details || null,
          medication: health.medication.trim() || null,
          allergies: health.allergies.trim() || null,
          emergency_contact_name: health.emergency_contact_name.trim() || null,
          emergency_contact_phone: health.emergency_contact_phone.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }

      if (program.cycle_id) {
        const agreed = program.agreed_amount ? toNumber(program.agreed_amount) : null;
        const enrollment = await restInsert<{ id: string }>('enrollments', {
          user_id: profileId,
          cycle_id: program.cycle_id,
          status: 'active',
          payment_status: payment.mode === 'total' ? 'paid' : 'unpaid',
          enrolled_by_name: program.enrolled_by_name.trim() || null,
          channel: program.channel || null,
          agreed_amount: agreed,
          scholarship: program.scholarship,
          deal_notes: program.deal_notes.trim() || null,
        }, { returning: 'representation' });
        if (!enrollment?.id) throw new Error('No se pudo crear la inscripción.');

        if (payAmount > 0) {
          await restInsert('payments', {
            enrollment_id: enrollment.id,
            amount: payAmount,
            method: payment.method,
            status: 'paid',
            paid_at: payment.paid_at || today(),
            concept: payment.mode === 'total' ? 'completo' : payment.concept,
            notes: payment.notes.trim() || null,
          }, { returning: 'minimal' });
        } else if (payment.notes.trim()) {
          await restInsert('enrollment_notes', { enrollment_id: enrollment.id, content: `Pago: ${payment.notes.trim()}` }, { returning: 'minimal' });
        }
      }

      if (comment.trim()) {
        const actor = await getMyActorInfo();
        await restInsert('profile_notes', {
          profile_id: profileId, body: comment.trim(), author_profile_id: actor?.profileId ?? null,
        }, { returning: 'minimal' });
      }

      const name = selected ? fullName(selected) : `${person.first_name} ${person.last_name}`.trim();
      toast.success(`Ficha de ${name} cargada`);
      setSaved(name);
      reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const cycle = cycles.find(c => c.id === program.cycle_id);
  const agreedNum = toNumber(program.agreed_amount);
  const pending = agreedNum - (payment.mode === 'nada' ? 0 : toNumber(payment.amount));

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
      <Link href="/admin/personas" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900">
        <IoArrowBackOutline size={16} /> Volver a Personas
      </Link>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cargar ficha</h1>
        <p className="text-xs text-slate-400 mt-0.5">Para pasar las fichas en papel, una persona a la vez. Sólo el nombre es obligatorio.</p>
      </div>

      {saved && (
        <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <IoCheckmarkCircle size={18} /> La ficha de {saved} quedó cargada. Ya podés cargar la siguiente.
        </p>
      )}

      {/* 1. Persona */}
      <Section n={1} title="Persona" hint="Si ya estuvo en HOME, buscala primero para no duplicarla.">
        {selected ? (
          <div className="flex items-center gap-3 bg-[#00A9CE]/5 border border-[#00A9CE]/20 rounded-xl px-4 py-3">
            <IoCheckmarkCircle size={18} className="text-[#00A9CE] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{fullName(selected)}</p>
              <p className="text-xs text-slate-400 truncate">{selected.email || selected.dni || 'Ya cargada en el sistema'}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs font-bold text-slate-500 hover:text-slate-900">Cambiar</button>
          </div>
        ) : (
          <>
            <div className="relative">
              <IoSearchOutline size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, apellido, email o DNI" className={`${inputCls} pl-9`} />
              {hits.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {hits.map(h => (
                    <button key={h.id} onClick={() => pick(h)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <span className="block text-sm font-bold text-slate-700">{fullName(h)}</span>
                      <span className="block text-xs text-slate-400">{[h.email, h.dni].filter(Boolean).join(' · ') || '—'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <IoPersonAddOutline size={13} /> O cargala nueva
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nombre *"><input value={person.first_name} onChange={setP('first_name')} className={inputCls} /></Field>
              <Field label="Apellido"><input value={person.last_name} onChange={setP('last_name')} className={inputCls} /></Field>
              <Field label="DNI"><input value={person.dni} onChange={setP('dni')} inputMode="numeric" className={inputCls} /></Field>
              <Field label="Teléfono"><input value={person.phone} onChange={setP('phone')} inputMode="tel" className={inputCls} /></Field>
              <Field label="Email"><input value={person.email} onChange={setP('email')} type="email" className={inputCls} /></Field>
              <Field label="Fecha de nacimiento"><input value={person.birth_date} onChange={setP('birth_date')} type="date" className={inputCls} /></Field>
              <Field label="Género">
                <select value={person.gender} onChange={setP('gender')} className={inputCls}>
                  <option value="">—</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
              </Field>
              <Field label="Ocupación / profesión"><input value={person.current_occupation} onChange={setP('current_occupation')} className={inputCls} /></Field>
              <Field label="Domicilio (calle y altura)"><input value={person.address_street} onChange={setP('address_street')} className={inputCls} /></Field>
              <Field label="Localidad"><input value={person.address_city} onChange={setP('address_city')} className={inputCls} /></Field>
              <Field label="Instagram"><input value={person.instagram} onChange={setP('instagram')} placeholder="@usuario" className={inputCls} /></Field>
              <Field label="Quién la invitó a HOME">
                <input value={person.referred_by_name} onChange={setP('referred_by_name')} className={inputCls} />
              </Field>
            </div>
            {duplicate && (
              <div className="flex items-center gap-3 text-sm bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <IoAlertCircleOutline size={18} className="text-amber-600 shrink-0" />
                <p className="flex-1 text-amber-800">Ya hay una ficha de <b>{fullName(duplicate)}</b> con esos datos.</p>
                <button onClick={() => pick(duplicate)} className="text-xs font-bold text-amber-800 underline">Usar esa ficha</button>
                <button onClick={() => setDuplicate(null)} aria-label="Cerrar"><IoCloseOutline size={16} className="text-amber-600" /></button>
              </div>
            )}
          </>
        )}
      </Section>

      {/* 2. Ficha de inscripción */}
      <Section n={2} title="Ficha de inscripción" hint="Lo que trae la ficha en papel o el formulario. Todo opcional: completá lo que haya.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INTAKE_FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <textarea value={intake[k]} onChange={setI(k)} rows={2} className={inputCls} />
            </Field>
          ))}
        </div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-2">Salud (confidencial)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Enfermedad crónica (cuál y desde cuándo)"><input value={health.chronic} onChange={setH('chronic')} placeholder="Vacío si no tiene" className={inputCls} /></Field>
          <Field label="Tratamiento psicológico / psiquiátrico">
            <select value={health.treatment} onChange={setH('treatment')} className={inputCls}>
              <option value="ninguno">Ninguno</option>
              <option value="psicologico">Psicológico</option>
              <option value="psiquiatrico">Psiquiátrico</option>
            </select>
          </Field>
          {health.treatment !== 'ninguno' && (
            <Field label="Detalle del tratamiento" className="sm:col-span-2"><input value={health.treatment_detail} onChange={setH('treatment_detail')} className={inputCls} /></Field>
          )}
          <Field label="Consumos (alcohol, drogas, recuperación)"><input value={health.consumption} onChange={setH('consumption')} placeholder="Vacío si no" className={inputCls} /></Field>
          <Field label="Medicación"><input value={health.medication} onChange={setH('medication')} className={inputCls} /></Field>
          <Field label="Alergias"><input value={health.allergies} onChange={setH('allergies')} className={inputCls} /></Field>
          <Field label="Contacto de emergencia (nombre)"><input value={health.emergency_contact_name} onChange={setH('emergency_contact_name')} className={inputCls} /></Field>
          <Field label="Contacto de emergencia (teléfono)"><input value={health.emergency_contact_phone} onChange={setH('emergency_contact_phone')} inputMode="tel" className={inputCls} /></Field>
        </div>
      </Section>

      {/* 3. Programa */}
      <Section n={3} title="Programa" hint="Dejalo vacío si la ficha es sólo de datos personales.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Camada" className="sm:col-span-2">
            <select value={program.cycle_id} onChange={setG('cycle_id')} className={inputCls}>
              <option value="">— Sin programa —</option>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name} · {CYCLE_TYPE_LABELS[c.type] ?? c.type}</option>)}
            </select>
          </Field>
          {program.cycle_id && (
            <>
              <Field label="Enrolador (quién la invitó a este programa)"><input value={program.enrolled_by_name} onChange={setG('enrolled_by_name')} className={inputCls} /></Field>
              <Field label="Cómo se inscribió">
                <select value={program.channel} onChange={setG('channel')} className={inputCls}>
                  <option value="enrolador">Por enrolador</option>
                  <option value="web">Por la web</option>
                  <option value="presencial">Presencial</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
              <Field label="Monto a pagar ($)"><input value={program.agreed_amount} onChange={setG('agreed_amount')} inputMode="numeric" placeholder="ej. 390.000" className={`${inputCls} font-mono`} /></Field>
              <Field label="Beca">
                <select value={program.scholarship} onChange={setG('scholarship')} className={inputCls}>
                  <option value="none">Sin beca</option>
                  <option value="half">Media beca</option>
                  <option value="full">Beca completa</option>
                </select>
              </Field>
              <Field label="Promo o acuerdo especial" className="sm:col-span-2">
                <input value={program.deal_notes} onChange={setG('deal_notes')} placeholder="ej. 2x1 con Juan Pérez · combo Inicial + Avanzado" className={inputCls} />
              </Field>
            </>
          )}
        </div>
      </Section>

      {/* 4. Pago */}
      {program.cycle_id && (
        <Section n={4} title="Pago" hint={cycle ? `De ${cycle.name}` : undefined}>
          <div className="grid grid-cols-3 gap-2">
            {([['total', 'Pago total'], ['parcial', 'Pago parcial'], ['nada', 'No pagó']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => choosePayMode(mode)}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  payment.mode === mode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {payment.mode !== 'nada' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Monto pagado ($)"><input value={payment.amount} onChange={setPay('amount')} inputMode="numeric" className={`${inputCls} font-mono`} /></Field>
              <Field label="Fecha del pago"><input value={payment.paid_at} onChange={setPay('paid_at')} type="date" className={inputCls} /></Field>
              <Field label="Medio">
                <select value={payment.method} onChange={setPay('method')} className={inputCls}>
                  <option value="transfer">Transferencia</option>
                  <option value="cash">Efectivo</option>
                  <option value="mercadopago">Mercado Pago</option>
                </select>
              </Field>
              {payment.mode === 'parcial' && (
                <Field label="Qué pagó">
                  <select value={payment.concept} onChange={setPay('concept')} className={inputCls}>
                    <option value="sena">Seña</option>
                    <option value="inicial">Pago inicial</option>
                    <option value="cuota">Cuota</option>
                    <option value="diferencia">Diferencia</option>
                    <option value="otro">Otro</option>
                  </select>
                </Field>
              )}
            </div>
          )}
          <Field label="Comentario del pago">
            <textarea value={payment.notes} onChange={setPay('notes')} rows={2} placeholder="ej. paga el resto el 15 · transfirió desde la cuenta de la mamá" className={inputCls} />
          </Field>
          {agreedNum > 0 && (
            <p className={`text-sm font-bold ${pending > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {pending > 0 ? `Queda a cobrar: $ ${formatMoney(String(pending))}` : 'Queda saldado'}
            </p>
          )}
        </Section>
      )}

      {/* 5. Comentario */}
      <Section n={program.cycle_id ? 5 : 4} title="Comentario interno" hint="Queda en la ficha con la fecha de hoy, como una nota del proceso.">
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className={inputCls} />
      </Section>

      <div className="flex items-center gap-3 pb-10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando…' : 'Guardar ficha'}
        </button>
        <button onClick={reset} disabled={saving} className="px-4 py-3 text-sm font-bold text-slate-500 hover:text-slate-900">Limpiar</button>
      </div>
    </div>
  );
}
