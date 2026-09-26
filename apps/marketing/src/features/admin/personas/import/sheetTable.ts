// Convierte una hoja "como la arma la gente" en una tabla importable.
//
// Las planillas de HOME tienen títulos arriba del encabezado ("INICIAL 54",
// "JULIO") y, dentro de la misma hoja, bloques separados por una fila-título
// ("AVANZADO 54", "PL 54 SAISEI") seguida de su propio encabezado, que puede
// tener las columnas en otro orden. Cada fila de datos se lee con el
// encabezado de su bloque y queda marcada con el bloque al que pertenece;
// después cada bloque se asigna a una camada.

export const BLOCK_KEY = '__bloque';

export interface SheetTable {
  headers: string[];
  rows: Record<string, string>[];
  /** Bloques en orden de aparición, con cuántas filas tiene cada uno. */
  blocks: { name: string; count: number }[];
}

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const isNameHeader = (c: string) => ['nombre', 'name'].includes(norm(c));
const isText = (c: string | undefined) => !!c && isNaN(Number(c));
const letter = (i: number) => (i >= 26 ? String.fromCharCode(64 + Math.floor(i / 26)) : '') + String.fromCharCode(65 + (i % 26));

/** Nombre de cada columna según una fila de encabezado (vacías → "Columna X", repetidas → "(2)"). */
function keysFor(header: string[], width: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < width; i++) {
    let k = header[i] || `Columna ${letter(i)}`;
    while (keys.includes(k)) k += ' (2)';
    keys.push(k);
  }
  return keys;
}

export function sheetToTable(sheetName: string, grid: string[][]): SheetTable {
  let headerIdx = grid.findIndex(r => r.some(isNameHeader));
  if (headerIdx < 0) headerIdx = grid.findIndex(r => r.filter(Boolean).length >= 3);
  if (headerIdx < 0) return { headers: [], rows: [], blocks: [] };

  const width = Math.max(...grid.map(r => r.length));
  let header = grid[headerIdx];
  let keys = keysFor(header, width);
  let nameCol = header.findIndex(isNameHeader);

  // Bloque inicial: el último título con pinta de programa arriba del
  // encabezado; si no hay, el nombre de la hoja.
  let block = sheetName;
  for (const r of grid.slice(0, headerIdx)) {
    const title = r.find(isText);
    if (title && looksLikeProgram(title)) block = title;
  }

  const headers: string[] = keys.filter((k, i) => header[i]);
  const addHeader = (k: string) => { if (!headers.includes(k)) headers.push(k); };
  const rows: Record<string, string>[] = [];
  const counts = new Map<string, number>();

  for (const r of grid.slice(headerIdx + 1)) {
    if (r.some(isNameHeader)) {
      header = r;
      keys = keysFor(header, width);
      nameCol = header.findIndex(isNameHeader);
      keys.forEach((k, i) => header[i] && addHeader(k));
      continue;
    }
    // Fila-título de un bloque: texto en la primera columna cuando esa columna
    // no es la del nombre ("AVANZADO 54", "SEÑAS", "ENERO").
    if (nameCol !== 0 && isText(r[0])) { block = r[0]; continue; }
    if (nameCol >= 0 ? !r[nameCol] : !r.some(Boolean)) continue;

    const row: Record<string, string> = { [BLOCK_KEY]: block };
    r.forEach((v, i) => {
      if (!v) return;
      row[keys[i]] = v;
      addHeader(keys[i]);
    });
    rows.push(row);
    counts.set(block, (counts.get(block) ?? 0) + 1);
  }

  return { headers, rows, blocks: [...counts].map(([name, count]) => ({ name, count })) };
}

export function looksLikeProgram(text: string): boolean {
  return /\b(inicial|avanzado|pl|plan lider|creser)\b/.test(norm(text));
}

/** Tipo de camada a partir del título del bloque o de la hoja. */
export function guessCycleType(text: string): 'initial' | 'advanced' | 'plan_lider' {
  const t = norm(text);
  if (/avanzad/.test(t)) return 'advanced';
  if (/\bpl\b|plan lider/.test(t)) return 'plan_lider';
  return 'initial';
}

/** Número de camada ("PL 54 SAISEI" → "54"), o el de la hoja si el bloque no tiene. */
export function guessCycleNumber(block: string, sheetName: string): string | null {
  return block.match(/\d+/)?.[0] ?? sheetName.match(/\d+/)?.[0] ?? null;
}
