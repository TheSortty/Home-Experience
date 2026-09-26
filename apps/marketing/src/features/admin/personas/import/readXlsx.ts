// Lector de .xlsx sin dependencias: un .xlsx es un ZIP de XMLs. El navegador
// ya trae DecompressionStream('deflate-raw') y DOMParser, así que alcanza con
// leer el directorio del ZIP y los XML de las hojas.
//
// Devuelve cada hoja como una grilla de texto (filas × columnas). Los números
// vienen normalizados ("4.1543863E7" → "41543863", "1.0" → "1"); las fechas de
// Excel quedan como número de serie y las convierte `toIsoDate` al aplicar.

export interface XlsxSheet {
  name: string;
  rows: string[][];
}

async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('El archivo no parece un Excel (.xlsx) válido.');

  const files = new Map<string, Uint8Array>();
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  for (let n = 0; n < count; n++) {
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    if (method === 0) files.set(name, data);
    else if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      files.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
    }
  }
  return files;
}

function normalizeCell(v: string): string {
  const s = v.trim();
  if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(s)) {
    const n = Number(s);
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  }
  return s;
}

function colIndex(ref: string): number {
  let n = 0;
  for (const c of ref.replace(/\d+/g, '')) n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
}

export async function readXlsx(file: File): Promise<XlsxSheet[]> {
  const files = await unzip(await file.arrayBuffer());
  const xml = (path: string) => {
    const f = files.get(path);
    return f ? new DOMParser().parseFromString(new TextDecoder().decode(f), 'application/xml') : null;
  };
  const text = (el: Element) => [...el.getElementsByTagName('t')].map(t => t.textContent ?? '').join('');

  const shared = [...(xml('xl/sharedStrings.xml')?.getElementsByTagName('si') ?? [])].map(text);
  const rels = new Map(
    [...(xml('xl/_rels/workbook.xml.rels')?.getElementsByTagName('Relationship') ?? [])]
      .map(r => [r.getAttribute('Id'), r.getAttribute('Target') ?? '']),
  );

  const sheets: XlsxSheet[] = [];
  for (const s of xml('xl/workbook.xml')?.getElementsByTagName('sheet') ?? []) {
    const target = rels.get(s.getAttribute('r:id')) ?? '';
    const doc = xml('xl/' + target.replace(/^\/?xl\//, ''));
    if (!doc) continue;
    const rows: string[][] = [];
    for (const r of doc.getElementsByTagName('row')) {
      const row: string[] = [];
      for (const c of r.getElementsByTagName('c')) {
        const type = c.getAttribute('t');
        const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
        const value = type === 's' ? shared[Number(v)] ?? ''
          : type === 'inlineStr' ? text(c)
          : type === 'str' ? v
          : normalizeCell(v);
        row[colIndex(c.getAttribute('r') ?? 'A1')] = value.trim();
      }
      if (row.some(Boolean)) rows.push(Array.from(row, v => v ?? ''));
    }
    sheets.push({ name: s.getAttribute('name') ?? 'Hoja', rows });
  }
  return sheets;
}
