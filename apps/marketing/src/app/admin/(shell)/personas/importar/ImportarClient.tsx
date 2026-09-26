'use client';

// Importador histórico del CRM (Etapa 2 del plan).
//
// Nada de lo que sube el staff toca profiles/enrollments directamente: primero
// se lee el archivo (Excel o CSV) en el navegador, se elige la hoja, se mapean
// columnas → campos destino, cada bloque de la hoja se asigna a una camada, y
// todo se guarda crudo en import_staging_rows. Recién al tocar "Aplicar" se
// resuelve contra profiles existentes y se escribe (ver import/applyRow.ts).
//
// Sigue el patrón ya establecido en esta sección (PersonasStudentsView,
// AssignProgramModal): REST directo a PostgREST vía supabaseRest.ts, sin
// server actions — el panel admin evita el cliente JS de Supabase por los
// cuelgues documentados en ese archivo.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import {
  IoArrowBackOutline, IoCloudUploadOutline, IoDocumentTextOutline,
  IoAlertCircleOutline, IoArrowForwardOutline,
  IoTrashOutline, IoCloseOutline, IoTimeOutline,
  IoSearchOutline, IoPlayForwardOutline, IoGridOutline,
} from 'react-icons/io5';
import { restSelect, restInsert, restBulkInsert, restUpdate } from '@home/services/supabaseRest';
import { DESTINATION_FIELDS, FIELD_GROUPS, guessDestinationField, type DestinationField } from '@/src/features/admin/personas/import/importFields';
import { readXlsx, type XlsxSheet } from '@/src/features/admin/personas/import/readXlsx';
import { sheetToTable, BLOCK_KEY, looksLikeProgram, guessCycleType, guessCycleNumber } from '@/src/features/admin/personas/import/sheetTable';
import { applyStagingRow, findExistingProfile } from '@/src/features/admin/personas/import/applyRow';
import { CYCLE_TYPE_LABELS } from '@/src/features/admin/personas/types';

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

interface Table {
  label: string;
  headers: string[];
  rows: Record<string, string>[];
  blocks: { name: string; count: number }[];
}

type Screen =
  | { kind: 'list' }
  | { kind: 'sheet'; fileName: string; sheets: XlsxSheet[] }
  | { kind: 'map'; table: Table }
  | { kind: 'batch'; batchId: string };

const CHUNK_SIZE = 300;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Fila (encabezado → texto) + mapeo (encabezado → campo destino) → objeto crudo
 * con claves de campo destino. Si varias columnas van al mismo campo (ej. las
 * preguntas de salud), se juntan todas con su pregunta adelante.
 */
function buildRawRow(row: Record<string, string>, mapping: Record<string, DestinationField>): Record<string, string> {
  const repeated = new Set(
    Object.values(mapping).filter((d, i, all) => d !== 'ignore' && all.indexOf(d) !== i),
  );
  const out: Record<string, string> = {};
  for (const [header, value] of Object.entries(row)) {
    const dest = mapping[header];
    const trimmed = (value ?? '').trim();
    if (!dest || dest === 'ignore' || !trimmed) continue;
    const piece = repeated.has(dest) ? `${header}: ${trimmed}` : trimmed;
    out[dest] = out[dest] ? `${out[dest]}\n${piece}` : piece;
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
    if (/\.xlsx$/i.test(file.name)) {
      try {
        const sheets = (await readXlsx(file)).filter(s => s.rows.length > 0);
        if (sheets.length === 0) { setLoadErr('El Excel no tiene hojas con datos.'); return; }
        setScreen({ kind: 'sheet', fileName: file.name, sheets });
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : 'No se pudo leer el Excel.');
      }
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          setLoadErr('No se pudieron leer columnas en ese archivo. ¿Es un CSV válido?');
          return;
        }
        const label = file.name.replace(/\.csv$/i, '');
        setScreen({ kind: 'map', table: { label, headers, rows: results.data, blocks: [] } });
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
          Subí un Excel o CSV, elegí la hoja, revisá qué va a cada lugar y confirmá. Nada se escribe en las fichas
          hasta que tocás "Aplicar".
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
              <p className="text-sm font-bold text-slate-700">Subí un Excel (.xlsx) o CSV</p>
              <p className="text-xs text-slate-400 mt-1">
                Tal cual está: con títulos, varias hojas y bloques (Inicial, Avanzado, PL). Después elegís qué hoja cargar.
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
              accept=".xlsx,.csv"
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

      {screen.kind === 'sheet' && (
        <SheetStep
          fileName={screen.fileName}
          sheets={screen.sheets}
          onCancel={() => setScreen({ kind: 'list' })}
          onPick={(table) => setScreen({ kind: 'map', table })}
        />
      )}

      {screen.kind === 'map' && (
        <MapStep
          table={screen.table}
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

// ─── Step: elegir hoja del Excel ────────────────────────────────────────────

function SheetStep({
  fileName, sheets, onCancel, onPick,
}: {
  fileName: string;
  sheets: XlsxSheet[];
  onCancel: () => void;
  onPick: (table: Table) => void;
}) {
  const tables = useMemo(() => sheets.map(s => ({ sheet: s, table: sheetToTable(s.name, s.rows) })), [sheets]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div>
        <p className="text-sm font-bold text-slate-900">{fileName}</p>
        <p className="text-xs text-slate-400">¿Qué hoja querés cargar? Se carga una por vez; después podés volver por las otras.</p>
      </div>
      <div className="space-y-1.5">
        {tables.map(({ sheet, table }) => (
          <button
            key={sheet.name}
            disabled={table.rows.length === 0}
            onClick={() => onPick({ label: `${fileName.replace(/\.xlsx$/i, '')} · ${sheet.name}`, ...table })}
            className="w-full flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 hover:border-[#00A9CE]/40 hover:shadow-sm transition-all text-left disabled:opacity-40 disabled:hover:shadow-none"
          >
            <IoGridOutline size={16} className="text-slate-400 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-700 truncate">{sheet.name}</span>
              <span className="block text-xs text-slate-400 truncate">
                {table.rows.length === 0
                  ? 'No se encontró una fila de encabezados'
                  : table.blocks.length > 1
                    ? table.blocks.map(b => `${b.name} (${b.count})`).join(' · ')
                    : `${table.rows.length} personas`}
              </span>
            </span>
            <IoArrowForwardOutline size={14} className="text-slate-300 shrink-0" />
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="text-sm font-bold text-slate-500 hover:text-slate-900">Cancelar</button>
    </div>
  );
}

// ─── Step: mapeo de columnas + camada de cada bloque ────────────────────────

interface CycleOption { id: string; name: string; type: string }
/** Para cada bloque: una camada existente, una nueva (nombre + tipo) o ninguna. */
type BlockChoice = { mode: 'existing'; cycleId: string } | { mode: 'new'; name: string; type: string } | { mode: 'none' };

const FOLLOW_UP_TARGETS = [
  { value: 'avanzado', label: 'Avanzado' },
  { value: 'pl', label: 'Plan Líder (PL)' },
  { value: 'formacion', label: 'Formación' },
];

function initialMapping(headers: string[]): Record<string, DestinationField> {
  const m: Record<string, DestinationField> = {};
  for (const h of headers) m[h] = guessDestinationField(h);
  // En una hoja de seguimiento (tiene "Encargada"/"En qué están"), "Estado" es
  // el estado del seguimiento, no el del pago.
  if (Object.values(m).some(d => d === 'follow_up_owner' || d === 'follow_up_notes')) {
    for (const h of headers) if (m[h] === 'deal_status') m[h] = 'follow_up_status';
  }
  return m;
}

function proposeNewCycle(block: string, label: string): BlockChoice & { mode: 'new' } {
  const type = guessCycleType(block);
  const number = guessCycleNumber(block, label);
  return { mode: 'new', type, name: `CRESER ${CYCLE_TYPE_LABELS[type]}${number ? ` ${number}` : ''}` };
}

function initialBlockChoice(block: string, label: string, cycles: CycleOption[]): BlockChoice {
  if (!looksLikeProgram(block) && !looksLikeProgram(label)) return { mode: 'none' };
  const proposal = proposeNewCycle(block, label);
  const number = guessCycleNumber(block, label);
  const match = number
    ? cycles.find(c => c.type === proposal.type && new RegExp(`\\b${number}\\b`).test(c.name))
    : undefined;
  return match ? { mode: 'existing', cycleId: match.id } : proposal;
}

function MapStep({
  table, onCancel, onStaged,
}: {
  table: Table;
  onCancel: () => void;
  onStaged: (batchId: string) => void;
}) {
  const { headers, rows, blocks } = table;
  const [sourceLabel, setSourceLabel] = useState(table.label);
  const [mapping, setMapping] = useState(() => initialMapping(headers));
  const [cycles, setCycles] = useState<CycleOption[] | null>(null);
  const [blockChoices, setBlockChoices] = useState<Record<string, BlockChoice>>({});
  const [followUpTarget, setFollowUpTarget] = useState('pl');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (blocks.length === 0) return;
    restSelect<CycleOption>('cycles', { columns: 'id,name,type', filters: { is_deleted: 'eq.false' }, order: 'start_date.desc', limit: 500 })
      .then(({ data }) => {
        setCycles(data);
        setBlockChoices(Object.fromEntries(blocks.map(b => [b.name, initialBlockChoice(b.name, table.label, data)])));
      })
      .catch(() => setCycles([]));
  }, [blocks, table.label]);

  const mappedCount = Object.values(mapping).filter(v => v !== 'ignore').length;
  const hasFollowUp = Object.values(mapping).some(d => d.startsWith('follow_up_'));

  const blockRaw = (block: string | undefined): Record<string, string> => {
    const choice = block ? blockChoices[block] : undefined;
    if (!choice || choice.mode === 'none') return {};
    if (choice.mode === 'existing') {
      const c = cycles?.find(x => x.id === choice.cycleId);
      return { cycle_id: choice.cycleId, program_name: c?.name ?? '', program_type: c?.type ?? '' };
    }
    return choice.name.trim() ? { program_name: choice.name.trim(), program_type: choice.type } : {};
  };

  const handleStage = async () => {
    setErr(null);
    if (mappedCount === 0) { setErr('Elegí a dónde va al menos una columna antes de continuar.'); return; }
    setSaving(true);
    try {
      const batch = await restInsert<{ id: string }>('import_batches', {
        source_label: sourceLabel.trim() || table.label,
        column_mapping: { columns: mapping, blocks: blockChoices, follow_up_target: hasFollowUp ? followUpTarget : null },
        status: 'staged',
      }, { returning: 'representation' });
      if (!batch?.id) throw new Error('No se pudo crear el lote de importación.');

      const stagingRows = rows.map((row, i) => ({
        batch_id: batch.id,
        row_number: i + 1,
        raw: {
          ...buildRawRow(row, mapping),
          ...blockRaw(row[BLOCK_KEY]),
          ...(hasFollowUp ? { follow_up_target: followUpTarget } : {}),
        },
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

  const selectCls = 'w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Nombre de esta importación</label>
        <input
          value={sourceLabel}
          onChange={e => setSourceLabel(e.target.value)}
          placeholder="ej. Excel CRESER 54"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30"
        />
      </div>

      {/* 1. Columnas */}
      <div>
        <p className="text-xs font-bold text-slate-600 mb-2">
          1. ¿Qué es cada columna? <span className="font-normal text-slate-400">({rows.length} personas, {mappedCount} de {headers.length} columnas se cargan)</span>
        </p>
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2">Columna</th>
                <th className="text-left px-3 py-2">Ejemplo</th>
                <th className="text-left px-3 py-2">Se guarda como</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {headers.map(h => (
                <tr key={h} className={mapping[h] === 'ignore' ? 'opacity-60' : ''}>
                  <td className="px-3 py-2 font-bold text-slate-700 max-w-[260px] truncate" title={h}>{h}</td>
                  <td className="px-3 py-2 text-slate-400 truncate max-w-[200px]">{rows.find(r => r[h])?.[h] || '—'}</td>
                  <td className="px-3 py-2 min-w-[220px]">
                    <select
                      value={mapping[h]}
                      onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value as DestinationField }))}
                      className={selectCls}
                    >
                      <option value="ignore">— No cargar —</option>
                      {FIELD_GROUPS.map(group => (
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

      {/* 2. Camadas */}
      {blocks.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-600 mb-2">
            2. ¿A qué camada va cada grupo? <span className="font-normal text-slate-400">(los grupos salen de los títulos de la hoja)</span>
          </p>
          {cycles === null ? (
            <p className="text-xs text-slate-400">Buscando camadas…</p>
          ) : (
            <div className="space-y-2">
              {blocks.map(b => {
                const choice = blockChoices[b.name] ?? { mode: 'none' };
                const set = (c: BlockChoice) => setBlockChoices(prev => ({ ...prev, [b.name]: c }));
                return (
                  <div key={b.name} className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 items-start border border-slate-100 rounded-xl p-3">
                    <div>
                      <p className="text-sm font-bold text-slate-700">{b.name}</p>
                      <p className="text-xs text-slate-400">{b.count} personas</p>
                    </div>
                    <div className="space-y-2">
                      <select
                        value={choice.mode === 'existing' ? choice.cycleId : choice.mode}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === 'none') set({ mode: 'none' });
                          else if (v === 'new') set(proposeNewCycle(b.name, table.label));
                          else set({ mode: 'existing', cycleId: v });
                        }}
                        className={selectCls}
                      >
                        <option value="none">Sin camada (sólo cargar la persona)</option>
                        <option value="new">+ Crear camada nueva</option>
                        <optgroup label="Camadas que ya existen">
                          {cycles.map(c => (
                            <option key={c.id} value={c.id}>{c.name} · {CYCLE_TYPE_LABELS[c.type] ?? c.type}</option>
                          ))}
                        </optgroup>
                      </select>
                      {choice.mode === 'new' && (
                        <div className="flex gap-2">
                          <input
                            value={choice.name}
                            onChange={e => set({ ...choice, name: e.target.value })}
                            placeholder="Nombre de la camada"
                            className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9CE]/30"
                          />
                          <select value={choice.type} onChange={e => set({ ...choice, type: e.target.value })} className={`${selectCls} w-40`}>
                            {Object.entries(CYCLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Seguimiento */}
      {hasFollowUp && (
        <div>
          <p className="text-xs font-bold text-slate-600 mb-2">3. Estos seguimientos son para ofrecerles…</p>
          <select value={followUpTarget} onChange={e => setFollowUpTarget(e.target.value)} className={`${selectCls} max-w-xs`}>
            {FOLLOW_UP_TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}

      {err && <p className="text-sm text-red-600 flex items-center gap-1.5"><IoAlertCircleOutline size={15} /> {err}</p>}
      {progress && (
        <p className="text-xs text-slate-400">Preparando… {progress.done}/{progress.total}</p>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <button
          onClick={handleStage}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
        >
          <IoArrowForwardOutline size={15} /> {saving ? 'Preparando…' : `Revisar ${rows.length} personas`}
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
  pending: 'Nueva', matched: 'Ya existe', created: 'Nueva', skipped: 'Descartada', error: 'Error', applied: 'Cargada',
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
    setBusy({ label: 'Buscando si ya existen', done: 0, total: pending.length });
    await restUpdate('import_batches', { status: 'resolving' }, { id: `eq.${batchId}` });

    const CONCURRENCY = 8;
    let done = 0;
    for (const group of chunk(pending, CONCURRENCY)) {
      await Promise.all(group.map(async (row) => {
        try {
          const matchId = await findExistingProfile(row.raw);
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
    setBusy({ label: 'Cargando', done: 0, total: toApply.length });

    // De a una y en orden: si la misma persona aparece en dos bloques, la
    // segunda fila encuentra el perfil que creó la primera.
    for (const row of toApply) {
      try {
        await applyStagingRow(row.id, row.matched_profile_id, row.raw);
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
    if (!confirm('¿Descartar esta importación? Nada se cargó todavía; el lote sale de la lista activa.')) return;
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

      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
        Primero tocá <b>Buscar si ya existen</b>: se compara por email, DNI o nombre y apellido. Las que figuran como
        "Ya existe" se suman a la ficha que ya está; las "Nuevas" crean una ficha. Si algo no corresponde, descartá esa
        fila. Después tocá <b>Cargar</b>.
      </p>

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
          <IoSearchOutline size={13} /> Buscar si ya existen
        </button>
        <button
          onClick={handleApply}
          disabled={!!busy || ((counts.pending ?? 0) + (counts.matched ?? 0)) === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-40 transition-colors"
        >
          <IoPlayForwardOutline size={13} /> Cargar
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
              <th className="text-left px-3 py-2">Camada</th>
              <th className="text-left px-3 py-2">Pago</th>
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
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                  {[row.raw.payment_amount, row.raw.deal_status].filter(Boolean).join(' · ') || '—'}
                </td>
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
