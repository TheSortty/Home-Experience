'use client';

// Importador histórico del CRM (Etapa 2 del plan).
//
// Nada de lo que sube el staff toca profiles/enrollments directamente: primero
// se parsea el CSV client-side, se mapean columnas → campos destino, y se
// guarda crudo en import_staging_rows. Recién al tocar "Aplicar" se resuelve
// contra profiles existentes (por email, luego DNI) y se escribe.
//
// Sigue el patrón ya establecido en esta sección (PersonasStudentsView,
// AssignProgramModal): REST directo a PostgREST vía supabaseRest.ts, sin
// server actions — el panel admin evita el cliente JS de Supabase por los
// cuelgues documentados en ese archivo.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import {
  IoArrowBackOutline, IoCloudUploadOutline, IoDocumentTextOutline,
  IoCheckmarkCircle, IoAlertCircleOutline, IoArrowForwardOutline,
  IoRefreshOutline, IoTrashOutline, IoCloseOutline, IoTimeOutline,
  IoSearchOutline, IoPlayForwardOutline,
} from 'react-icons/io5';
import { restSelect, restInsert, restBulkInsert, restUpdate } from '@home/services/supabaseRest';
import { DESTINATION_FIELDS, guessDestinationField, fieldLabel, type DestinationField } from '@/src/features/admin/personas/import/importFields';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ImportBatch {
  id: string;
  source_label: string;
  status: 'staged' | 'resolving' | 'applied' | 'discarded';
  created_at: string;
}

interface StagingRow {
  id: string;
  batch_id: string;
  row_number: number;
  raw: Record<string, string>;
  matched_profile_id: string | null;
  created_profile_id: string | null;
  status: 'pending' | 'matched' | 'created' | 'skipped' | 'error' | 'applied';
  error_message: string | null;
}

type Screen =
  | { kind: 'list' }
  | { kind: 'map'; fileName: string; headers: string[]; rows: Record<string, string>[] }
  | { kind: 'batch'; batchId: string };

const CHUNK_SIZE = 300;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normalizeDni(v: string): string {
  return v.replace(/\D/g, '');
}

/** CSV row (header → texto) + mapeo (header → campo destino) → objeto crudo con claves de campo destino. */
function buildRawRow(row: Record<string, string>, mapping: Record<string, DestinationField>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [header, value] of Object.entries(row)) {
    const dest = mapping[header];
    if (!dest || dest === 'ignore') continue;
    const trimmed = (value ?? '').trim();
    if (!trimmed) continue;
    out[dest] = trimmed;
  }
  return out;
}

// ─── Root component ─────────────────────────────────────────────────────────

export default function ImportarClient() {
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [batches, setBatches] = useState<ImportBatch[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBatches = async () => {
    try {
      const { data } = await restSelect<ImportBatch>('import_batches', {
        columns: 'id,source_label,status,created_at',
        order: 'created_at.desc',
        limit: 50,
      });
      setBatches(data);
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'No se pudieron cargar las importaciones anteriores.');
    }
  };

  useEffect(() => { loadBatches(); }, []);

  const handleFilePicked = async (file: File) => {
    setLoadErr(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          setLoadErr('No se pudieron leer columnas en ese archivo. ¿Es un CSV válido?');
          return;
        }
        setScreen({ kind: 'map', fileName: file.name, headers, rows: results.data });
      },
      error: (err) => setLoadErr(`No se pudo leer el archivo: ${err.message}`),
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/personas"
          className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors shrink-0"
        >
          <IoArrowBackOutline size={16} />
          Volver a Personas
        </Link>
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Importar histórico</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Subí un CSV, mapeá sus columnas y revisá los duplicados antes de aplicar. Nada se escribe en las fichas
          de alumnos hasta que confirmás la aplicación de cada importación.
        </p>
      </div>

      {loadErr && (
        <p className="text-sm text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <IoAlertCircleOutline size={16} /> {loadErr}
        </p>
      )}

      {screen.kind === 'list' && (
        <>
          {/* Upload card */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center space-y-3">
            <IoCloudUploadOutline size={32} className="mx-auto text-slate-300" />
            <div>
              <p className="text-sm font-bold text-slate-700">Subí un archivo CSV</p>
              <p className="text-xs text-slate-400 mt-1">
                Excel exportado como CSV, planilla de Google Sheets descargada como CSV, lo que tengas.
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <IoDocumentTextOutline size={15} /> Elegir archivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePicked(f); e.target.value = ''; }}
            />
          </div>

          {/* Batch history */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Importaciones anteriores</p>
            {batches === null ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-[#00A9CE] rounded-full animate-spin" />
              </div>
            ) : batches.length === 0 ? (
              <p className="text-sm text-slate-400 italic px-1">Todavía no se importó nada.</p>
            ) : (
              <div className="space-y-1.5">
                {batches.map(b => <BatchRow key={b.id} batch={b} onOpen={() => setScreen({ kind: 'batch', batchId: b.id })} />)}
              </div>
            )}
          </div>
        </>
      )}

      {screen.kind === 'map' && (
        <MapStep
          fileName={screen.fileName}
          headers={screen.headers}
          rows={screen.rows}
          onCancel={() => setScreen({ kind: 'list' })}
          onStaged={(batchId) => { loadBatches(); setScreen({ kind: 'batch', batchId }); }}
        />
      )}

      {screen.kind === 'batch' && (
        <BatchStep
          batchId={screen.batchId}
          onBack={() => { loadBatches(); setScreen({ kind: 'list' }); }}
        />
      )}
    </div>
  );
}

// ─── Batch history row ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<ImportBatch['status'], string> = {
  staged: 'Sin resolver', resolving: 'Resolviendo', applied: 'Aplicado', discarded: 'Descartado',
};
const STATUS_COLOR: Record<ImportBatch['status'], string> = {
  staged: 'bg-amber-100 text-amber-700', resolving: 'bg-[#00A9CE]/10 text-[#00A9CE]',
  applied: 'bg-emerald-100 text-emerald-700', discarded: 'bg-slate-100 text-slate-400',
};

function BatchRow({ batch, onOpen }: { batch: ImportBatch; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-[#00A9CE]/40 hover:shadow-sm transition-all text-left"
    >
      <IoDocumentTextOutline size={16} className="text-slate-400 shrink-0" />
      <span className="flex-1 min-w-0 truncate text-sm font-bold text-slate-700">{batch.source_label}</span>
      <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLOR[batch.status]}`}>
        {STATUS_LABEL[batch.status]}
      </span>
      <span className="shrink-0 text-xs text-slate-400 flex items-center gap-1">
        <IoTimeOutline size={11} /> {new Date(batch.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
    </button>
  );
}

// ─── Step: mapeo de columnas ────────────────────────────────────────────────

function MapStep({
  fileName, headers, rows, onCancel, onStaged,
}: {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  onCancel: () => void;
  onStaged: (batchId: string) => void;
}) {
  const [sourceLabel, setSourceLabel] = useState(fileName.replace(/\.csv$/i, ''));
  const [mapping, setMapping] = useState<Record<string, DestinationField>>(() => {
    const initial: Record<string, DestinationField> = {};
    for (const h of headers) initial[h] = guessDestinationField(h);
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const mappedCount = Object.values(mapping).filter(v => v !== 'ignore').length;

  const handleStage = async () => {
    setErr(null);
    if (mappedCount === 0) { setErr('Mapeá al menos una columna antes de continuar.'); return; }
    setSaving(true);
    try {
      const batch = await restInsert<{ id: string }>('import_batches', {
        source_label: sourceLabel.trim() || fileName,
        column_mapping: mapping,
        status: 'staged',
      }, { returning: 'representation' });
      if (!batch?.id) throw new Error('No se pudo crear el lote de importación.');

      const stagingRows = rows.map((row, i) => ({
        batch_id: batch.id,
        row_number: i + 1,
        raw: buildRawRow(row, mapping),
        status: 'pending' as const,
      }));

      const groups = chunk(stagingRows, CHUNK_SIZE);
      setProgress({ done: 0, total: stagingRows.length });
      for (const group of groups) {
        await restBulkInsert('import_staging_rows', group);
        setProgress(p => p ? { done: p.done + group.length, total: p.total } : null);
      }

      onStaged(batch.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falló la carga a staging.');
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Nombre de esta importación</label>
        <input
          value={sourceLabel}
          onChange={e => setSourceLabel(e.target.value)}
          placeholder="ej. Excel CRESER 2022"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30"
        />
      </div>

      <div>
        <p className="text-xs font-bold text-slate-600 mb-2">
          Mapeo de columnas <span className="font-normal text-slate-400">({rows.length} filas detectadas, {mappedCount} de {headers.length} columnas mapeadas)</span>
        </p>
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2">Columna del CSV</th>
                <th className="text-left px-3 py-2">Ejemplo</th>
                <th className="text-left px-3 py-2">Campo destino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {headers.map(h => (
                <tr key={h}>
                  <td className="px-3 py-2 font-bold text-slate-700 whitespace-nowrap">{h}</td>
                  <td className="px-3 py-2 text-slate-400 truncate max-w-[220px]">{rows[0]?.[h] || '—'}</td>
                  <td className="px-3 py-2">
                    <select
                      value={mapping[h]}
                      onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value as DestinationField }))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30"
                    >
                      <option value="ignore">— Ignorar —</option>
                      {(['Persona', 'Inscripción'] as const).map(group => (
                        <optgroup key={group} label={group}>
                          {DESTINATION_FIELDS.filter(f => f.group === group).map(f => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {err && <p className="text-sm text-red-600 flex items-center gap-1.5"><IoAlertCircleOutline size={15} /> {err}</p>}
      {progress && (
        <p className="text-xs text-slate-400">Cargando a staging… {progress.done}/{progress.total}</p>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <button
          onClick={handleStage}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
        >
          <IoArrowForwardOutline size={15} /> {saving ? 'Cargando…' : `Cargar ${rows.length} filas a staging`}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Step: revisión + resolución + aplicación de un batch ──────────────────

const ROW_STATUS_LABEL: Record<StagingRow['status'], string> = {
  pending: 'Nuevo', matched: 'Existente', created: 'Nuevo', skipped: 'Descartada', error: 'Error', applied: 'Aplicada',
};
const ROW_STATUS_COLOR: Record<StagingRow['status'], string> = {
  pending: 'bg-violet-100 text-violet-700', matched: 'bg-[#00A9CE]/10 text-[#00A9CE]', created: 'bg-violet-100 text-violet-700',
  skipped: 'bg-slate-100 text-slate-400', error: 'bg-red-100 text-red-600', applied: 'bg-emerald-100 text-emerald-700',
};

function BatchStep({ batchId, onBack }: { batchId: string; onBack: () => void }) {
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<StagingRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | { label: string; done: number; total: number }>(null);

  const load = async () => {
    try {
      const [{ data: batches }, { data: stagingRows }] = await Promise.all([
        restSelect<ImportBatch>('import_batches', { columns: 'id,source_label,status,created_at', filters: { id: `eq.${batchId}` }, limit: 1 }),
        restSelect<StagingRow>('import_staging_rows', { columns: '*', filters: { batch_id: `eq.${batchId}` }, order: 'row_number.asc', limit: 5000 }),
      ]);
      setBatch(batches[0] ?? null);
      setRows(stagingRows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo cargar la importación.');
    }
  };

  useEffect(() => { load(); }, [batchId]);

  const counts = (rows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const handleResolve = async () => {
    if (!rows) return;
    setErr(null);
    const pending = rows.filter(r => r.status === 'pending');
    if (pending.length === 0) return;
    setBusy({ label: 'Buscando coincidencias', done: 0, total: pending.length });
    await restUpdate('import_batches', { status: 'resolving' }, { id: `eq.${batchId}` });

    const CONCURRENCY = 8;
    let done = 0;
    for (const group of chunk(pending, CONCURRENCY)) {
      await Promise.all(group.map(async (row) => {
        try {
          let matchId: string | null = null;
          const email = row.raw.email;
          const dni = row.raw.dni ? normalizeDni(row.raw.dni) : '';
          if (email) {
            const { data } = await restSelect<{ id: string }>('profiles', { columns: 'id', filters: { email: `ilike.${email}` }, limit: 1 });
            matchId = data[0]?.id ?? null;
          }
          if (!matchId && dni) {
            const { data } = await restSelect<{ id: string }>('profiles', { columns: 'id', filters: { dni: `eq.${dni}` }, limit: 1 });
            matchId = data[0]?.id ?? null;
          }
          if (matchId) {
            await restUpdate('import_staging_rows', { matched_profile_id: matchId, status: 'matched' }, { id: `eq.${row.id}` });
          }
        } catch {
          // fila individual: si falla la búsqueda queda 'pending', se reintenta en la próxima resolución
        } finally {
          done += 1;
          setBusy(b => b ? { ...b, done } : b);
        }
      }));
    }

    await restUpdate('import_batches', { status: 'staged' }, { id: `eq.${batchId}` });
    setBusy(null);
    await load();
  };

  const handleToggleSkip = async (row: StagingRow) => {
    const next = row.status === 'skipped' ? 'pending' : 'skipped';
    await restUpdate('import_staging_rows', { status: next }, { id: `eq.${row.id}` });
    setRows(prev => prev?.map(r => r.id === row.id ? { ...r, status: next } : r) ?? null);
  };

  const handleApply = async () => {
    if (!rows) return;
    setErr(null);
    const toApply = rows.filter(r => r.status === 'pending' || r.status === 'matched');
    if (toApply.length === 0) return;
    setBusy({ label: 'Aplicando', done: 0, total: toApply.length });

    for (const row of toApply) {
      try {
        await applyStagingRow(row);
      } catch (e) {
        await restUpdate('import_staging_rows', {
          status: 'error',
          error_message: e instanceof Error ? e.message : 'Error desconocido',
        }, { id: `eq.${row.id}` });
      } finally {
        setBusy(b => b ? { ...b, done: b.done + 1 } : b);
      }
    }

    const { data: remaining } = await restSelect<{ status: string }>('import_staging_rows', {
      columns: 'status', filters: { batch_id: `eq.${batchId}` }, limit: 5000,
    });
    const stillPending = remaining.some(r => r.status === 'pending' || r.status === 'matched');
    await restUpdate('import_batches', { status: stillPending ? 'staged' : 'applied' }, { id: `eq.${batchId}` });

    setBusy(null);
    await load();
  };

  const handleDiscard = async () => {
    if (!confirm('¿Descartar esta importación? Las filas quedan guardadas (nada se aplicó todavía) pero el lote sale de la lista activa.')) return;
    await restUpdate('import_batches', { status: 'discarded' }, { id: `eq.${batchId}` });
    onBack();
  };

  if (!batch || !rows) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-slate-100 border-t-[#00A9CE] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-slate-900">{batch.source_label}</p>
          <p className="text-xs text-slate-400">{rows.length} filas · {STATUS_LABEL[batch.status]}</p>
        </div>
        <button onClick={onBack} className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <IoArrowBackOutline size={13} /> Volver al listado
        </button>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {(['pending', 'matched', 'skipped', 'error', 'applied'] as const).map(s => (
          <span key={s} className={`text-[11px] font-black px-2.5 py-1 rounded-full ${ROW_STATUS_COLOR[s]}`}>
            {ROW_STATUS_LABEL[s]}: {counts[s] ?? 0}
          </span>
        ))}
      </div>

      {err && <p className="text-sm text-red-600 flex items-center gap-1.5"><IoAlertCircleOutline size={15} /> {err}</p>}
      {busy && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
          <div className="w-4 h-4 border-2 border-slate-200 border-t-[#00A9CE] rounded-full animate-spin shrink-0" />
          {busy.label}… {busy.done}/{busy.total}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <button
          onClick={handleResolve}
          disabled={!!busy || (counts.pending ?? 0) === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00A9CE] hover:bg-blue-600 text-white text-xs font-bold rounded-lg disabled:opacity-40 transition-colors"
        >
          <IoSearchOutline size={13} /> Resolver duplicados
        </button>
        <button
          onClick={handleApply}
          disabled={!!busy || ((counts.pending ?? 0) + (counts.matched ?? 0)) === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-40 transition-colors"
        >
          <IoPlayForwardOutline size={13} /> Aplicar pendientes/existentes
        </button>
        <button
          onClick={handleDiscard}
          disabled={!!busy}
          className="flex items-center gap-1.5 px-3.5 py-2 text-red-500 hover:text-red-700 text-xs font-bold disabled:opacity-40 ml-auto"
        >
          <IoTrashOutline size={13} /> Descartar importación
        </button>
      </div>

      {/* Row table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Nombre</th>
              <th className="text-left px-3 py-2">Email / DNI</th>
              <th className="text-left px-3 py-2">Programa</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-left px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(row => (
              <tr key={row.id} className={row.status === 'skipped' ? 'opacity-40' : ''}>
                <td className="px-3 py-2 text-slate-400">{row.row_number}</td>
                <td className="px-3 py-2 font-bold text-slate-700 whitespace-nowrap">
                  {[row.raw.first_name, row.raw.last_name].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                  {row.raw.email || row.raw.dni || '—'}
                </td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.raw.program_name || '—'}</td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${ROW_STATUS_COLOR[row.status]}`}>
                    {ROW_STATUS_LABEL[row.status]}
                  </span>
                  {row.status === 'error' && row.error_message && (
                    <p className="text-[10px] text-red-500 mt-0.5 max-w-[220px] truncate" title={row.error_message}>{row.error_message}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {(row.status === 'pending' || row.status === 'matched' || row.status === 'skipped') && (
                    <button
                      onClick={() => handleToggleSkip(row)}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1"
                    >
                      <IoCloseOutline size={12} /> {row.status === 'skipped' ? 'Restaurar' : 'Descartar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Aplicar una fila: crea/actualiza profile + cycle + enrollment ─────────

async function applyStagingRow(row: StagingRow): Promise<void> {
  const raw = row.raw;
  let profileId = row.matched_profile_id;

  if (!profileId) {
    const created = await restInsert<{ id: string }>('profiles', {
      first_name: raw.first_name ?? null,
      last_name: raw.last_name ?? null,
      email: raw.email ?? null,
      phone: raw.phone ?? null,
      dni: raw.dni ? normalizeDni(raw.dni) : null,
      birth_date: raw.birth_date || null,
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
    if (!created?.id) throw new Error('No se pudo crear el perfil');
    profileId = created.id;
  }

  let cycleId: string | null = null;
  if (raw.program_name) {
    const { data: existing } = await restSelect<{ id: string }>('cycles', {
      columns: 'id', filters: { name: `ilike.${raw.program_name}` }, limit: 1,
    });
    if (existing[0]) {
      cycleId = existing[0].id;
    } else {
      const fallbackDate = raw.enrolled_at || new Date().toISOString().slice(0, 10);
      const createdCycle = await restInsert<{ id: string }>('cycles', {
        name: raw.program_name,
        type: raw.program_type || 'initial',
        start_date: fallbackDate,
        end_date: raw.completed_at || fallbackDate,
        status: 'finished',
      }, { returning: 'representation' });
      cycleId = createdCycle?.id ?? null;
    }
  }

  const enrollmentPayload: Record<string, unknown> = {
    user_id: profileId,
    cycle_id: cycleId,
    status: raw.enrollment_status || 'completed',
    payment_status: raw.payment_status || 'unpaid',
  };
  if (raw.enrolled_at) enrollmentPayload.enrolled_at = raw.enrolled_at;
  if (raw.completed_at) enrollmentPayload.completed_at = raw.completed_at;

  const enrollment = await restInsert<{ id: string }>('enrollments', enrollmentPayload, { returning: 'representation' });

  if (raw.enrollment_notes && enrollment?.id) {
    await restInsert('enrollment_notes', {
      enrollment_id: enrollment.id,
      content: raw.enrollment_notes,
    }, { returning: 'minimal' });
  }

  await restUpdate('import_staging_rows', {
    status: 'applied',
    matched_profile_id: profileId,
    created_profile_id: row.matched_profile_id ? null : profileId,
  }, { id: `eq.${row.id}` });
}
