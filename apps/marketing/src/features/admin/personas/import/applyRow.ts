// Aplicar una fila del importador: persona (+ ficha y salud), inscripción en la
// camada, pago, notas y seguimiento. Cada fila llega con las claves de
// `importFields.ts` ya resueltas (ver buildRawRow en ImportarClient).
//
// Los Excel de HOME mezclan números y texto en la misma columna ("210000",
// "2x1 Roni", "Enero"): lo que es número se usa para calcular, y lo que es texto
// se guarda como acuerdo especial para que no se pierda nada.

import { restSelect, restInsert, restUpdate, restUpsert } from '@home/services/supabaseRest';

export type RawRow = Record<string, string>;

export const normalizeDni = (v: string) => v.replace(/\D/g, '');

/** "210000", "$350.000", "84.000,50" → número. Texto ("2x1", "Enero") → null. */
export function parseAmount(v: string | undefined): number | null {
  if (!v) return null;
  const s = v.trim();
  if (s === '-') return 0;
  if (!/^\$?\s*[\d.,]+$/.test(s)) return null;
  const clean = s.replace(/[$\s]/g, '');
  const n = /,\d{1,2}$/.test(clean)
    ? Number(clean.replace(/\./g, '').replace(',', '.'))
    : /^\d+\.\d{1,2}$/.test(clean) ? Number(clean) : Number(clean.replace(/[.,]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Serie de Excel (45700), "25/11/1998" o "1998-11-25" → "1998-11-25". Otra cosa → null. */
export function toIsoDate(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86_400_000).toISOString().slice(0, 10);
  }
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `19${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

/** "1", "si", "x", "CAIDO", "SALUD MENTAL" → true. "", "0", "no" → false. */
const isYes = (v: string | undefined) => !!v && !['0', 'no', 'false', '-'].includes(v.trim().toLowerCase());
/** El texto de la celda cuando dice algo más que "1"/"sí" (ej. el motivo de la baja). */
const reasonText = (v: string | undefined) =>
  v && isNaN(Number(v)) && !['si', 'sí', 'x'].includes(v.trim().toLowerCase()) ? v.trim() : null;

/** "Mariela Soledad Correa" → { first: "Mariela Soledad", last: "Correa" }. */
export function splitName(raw: RawRow): { first: string | null; last: string | null } {
  if (raw.last_name) return { first: raw.first_name ?? null, last: raw.last_name };
  const parts = (raw.first_name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: parts[0] ?? null, last: null };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

/**
 * Busca a la persona en la base: email, después DNI, después nombre + apellido.
 * Con un solo nombre ("Agustin") no se busca: hay demasiados homónimos.
 */
export async function findExistingProfile(raw: RawRow): Promise<string | null> {
  if (raw.email) {
    const { data } = await restSelect<{ id: string }>('profiles', { columns: 'id', filters: { email: `ilike.${raw.email}` }, limit: 1 });
    if (data[0]) return data[0].id;
  }
  const dni = raw.dni ? normalizeDni(raw.dni) : '';
  if (dni) {
    const { data } = await restSelect<{ id: string }>('profiles', { columns: 'id', filters: { dni: `eq.${dni}` }, limit: 1 });
    if (data[0]) return data[0].id;
  }
  const { first, last } = splitName(raw);
  if (first && last) {
    const { data } = await restSelect<{ id: string }>('profiles', {
      columns: 'id', filters: { first_name: `ilike.${first}`, last_name: `ilike.${last}`, is_deleted: 'eq.false' }, limit: 2,
    });
    if (data.length === 1) return data[0].id;
  }
  return null;
}

const FOLLOW_UP_STATUS: [RegExp, string][] = [
  [/no\s*eleg/i, 'no_elegible'], [/sin\s*resp/i, 'sin_respuesta'], [/duda/i, 'duda'],
  [/^no\b/i, 'no'], [/^s[ií]\b/i, 'si'], [/contact/i, 'contactar'],
];

function paymentConcept(deal: string): string {
  if (/se[ñn]a/i.test(deal)) return 'sena';
  if (/complet/i.test(deal)) return 'completo';
  if (/cuota/i.test(deal)) return 'cuota';
  return 'inicial';
}

export async function applyStagingRow(rowId: string, matchedProfileId: string | null, raw: RawRow): Promise<void> {
  // ── Persona ────────────────────────────────────────────────────────────────
  // Se vuelve a buscar por si una fila anterior de la misma importación ya la
  // creó (misma persona en el bloque Inicial y en el Avanzado).
  let profileId = matchedProfileId ?? await findExistingProfile(raw);
  const created = !profileId;
  if (!profileId) {
    const { first, last } = splitName(raw);
    const row = await restInsert<{ id: string }>('profiles', {
      first_name: first,
      last_name: last,
      email: raw.email || null,
      phone: raw.phone || null,
      dni: raw.dni ? normalizeDni(raw.dni) || null : null,
      birth_date: toIsoDate(raw.birth_date),
      gender: raw.gender || null,
      address_street: raw.address_street || null,
      address_city: raw.address_city || null,
      address_province: raw.address_province || null,
      current_occupation: raw.current_occupation || null,
      referred_by_name: raw.referred_by_name || null,
      instagram: raw.instagram || null,
      bio: raw.bio || null,
      role: 'student',
    }, { returning: 'representation' });
    if (!row?.id) throw new Error('No se pudo crear el perfil');
    profileId = row.id;
  }

  // ── Ficha: sueños y salud ─────────────────────────────────────────────────
  const intake: Record<string, string> = {};
  for (const k of ['dream1', 'dream2', 'dream3', 'qualities', 'context', 'daily_routine', 'energy_leaks', 'life_history']) {
    if (raw[k]) intake[k] = raw[k];
  }
  if (Object.keys(intake).length) {
    await restUpsert('profile_intake', { profile_id: profileId, ...intake }, { onConflict: 'profile_id' });
  }
  if (raw.under_treatment || raw.medical_notes) {
    const treatment = raw.under_treatment ?? '';
    await restUpsert('medical_info', {
      user_id: profileId,
      under_treatment: treatment ? !/^(no|ninguno|ninguna)$/i.test(treatment.trim()) : null,
      treatment_details: [treatment && `Tratamiento: ${treatment}`, raw.medical_notes].filter(Boolean).join('\n') || null,
    }, { onConflict: 'user_id' });
  }

  // ── Inscripción ────────────────────────────────────────────────────────────
  const hasEnrollment = raw.cycle_id || raw.program_name;
  if (hasEnrollment) {
    let cycleId = raw.cycle_id || null;
    let cycleEnded = false;
    if (cycleId) {
      const { data } = await restSelect<{ end_date: string }>('cycles', { columns: 'end_date', filters: { id: `eq.${cycleId}` }, limit: 1 });
      cycleEnded = !!data[0] && data[0].end_date < new Date().toISOString().slice(0, 10);
    } else {
      const { data: existing } = await restSelect<{ id: string }>('cycles', {
        columns: 'id', filters: { name: `ilike.${raw.program_name}` }, limit: 1,
      });
      if (existing[0]) cycleId = existing[0].id;
      else {
        const date = toIsoDate(raw.enrolled_at) ?? new Date().toISOString().slice(0, 10);
        const cycle = await restInsert<{ id: string }>('cycles', {
          name: raw.program_name,
          type: raw.program_type || 'initial',
          start_date: date,
          end_date: toIsoDate(raw.completed_at) ?? date,
          status: 'finished',
        }, { returning: 'representation' });
        cycleId = cycle?.id ?? null;
        cycleEnded = true;
      }
    }

    const paid = parseAmount(raw.payment_amount);
    const due = parseAmount(raw.balance_due);
    const deal = raw.deal_status ?? '';
    const fullyPaid = due === 0 || /complet/i.test(deal) || /^s[ií]$/i.test(raw.payment_status ?? '');
    const agreed = paid !== null && due !== null ? paid + due : fullyPaid && paid !== null ? paid : null;
    const dealNotes = [
      raw.deal_notes,
      paid === null && raw.payment_amount ? `Pago: ${raw.payment_amount}` : null,
      due === null && raw.balance_due ? `A cobrar: ${raw.balance_due}` : null,
      deal && !/^(pago )?(inicial|completo)$/i.test(deal.trim()) ? deal : null,
    ].filter(Boolean).join(' · ') || null;

    const dropped = isYes(raw.dropped_flag);
    const status = dropped ? 'dropped'
      : isYes(raw.completed_flag) ? 'completed'
      : raw.enrollment_status?.toLowerCase() || (cycleEnded ? 'completed' : 'active');

    const enrollment = await restInsert<{ id: string }>('enrollments', {
      user_id: profileId,
      cycle_id: cycleId,
      status,
      payment_status: fullyPaid ? 'paid' : 'unpaid',
      enrolled_at: toIsoDate(raw.enrolled_at) ?? undefined,
      completed_at: toIsoDate(raw.completed_at) ?? undefined,
      enrolled_by_name: raw.enrolled_by_name || null,
      channel: raw.channel ? raw.channel.toLowerCase() : null,
      agreed_amount: agreed,
      scholarship: /media\s*beca/i.test(deal) ? 'half' : /beca/i.test(deal) ? 'full' : 'none',
      deal_notes: dealNotes,
      drop_reason: dropped ? reasonText(raw.dropped_flag) : null,
      extras: raw.shirt_size ? { shirt_size: raw.shirt_size } : {},
    }, { returning: 'representation' });
    if (!enrollment?.id) throw new Error('No se pudo crear la inscripción');

    if (paid) {
      await restInsert('payments', {
        enrollment_id: enrollment.id,
        amount: paid,
        method: 'manual',
        status: 'paid',
        paid_at: toIsoDate(raw.enrolled_at),
        concept: paymentConcept(deal),
        notes: 'Importado de Excel',
      }, { returning: 'minimal' });
    }
    if (raw.enrollment_notes) {
      await restInsert('enrollment_notes', { enrollment_id: enrollment.id, content: raw.enrollment_notes }, { returning: 'minimal' });
    }
  }

  // ── Seguimiento (BACKS) ────────────────────────────────────────────────────
  if (raw.follow_up_status || raw.follow_up_owner || raw.follow_up_notes) {
    const s = raw.follow_up_status ?? '';
    await restUpsert('follow_ups', {
      profile_id: profileId,
      target: raw.follow_up_target || 'pl',
      status: FOLLOW_UP_STATUS.find(([re]) => re.test(s.trim()))?.[1] ?? 'contactar',
      owner_name: raw.follow_up_owner || null,
      notes: [raw.follow_up_notes, s && !FOLLOW_UP_STATUS.some(([re]) => re.test(s.trim())) ? `Estado original: ${s}` : null]
        .filter(Boolean).join('\n') || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id,target' });
  }

  await restUpdate('import_staging_rows', {
    status: 'applied',
    matched_profile_id: profileId,
    created_profile_id: created ? profileId : null,
  }, { id: `eq.${rowId}` });
}
