// Extractos en PDF (Nequi y otros bancos): se leen en el propio celular con pdf.js y se convierten en una
// tabla (filas y columnas) como la de un Excel, para usar el mismo importador (lib/statementImport.ts).
// El archivo no se sube a ningún lado. Si el PDF tiene clave (Nequi suele pedir el número de documento),
// la persona la escribe y solo se usa para abrirlo aquí.

export type PdfItem = { x: number; str: string; w?: number }; // w: ancho real del texto (pdf.js lo da)
export type PdfLine = PdfItem[];

const HEADER_RE = /fecha/i;
const HEADER_COL_RE = /(fecha|descrip|detalle|concepto|valor|monto|saldo|debito|débito|credito|crédito|referencia|tipo)/i;

/** Junta los textos de una línea que están pegados y separa en celdas donde hay un hueco grande. */
function splitByGaps(line: PdfLine, gap = 14): string[] {
  const items = [...line].sort((a, b) => a.x - b.x);
  const cells: { x: number; end: number; str: string }[] = [];
  for (const it of items) {
    const w = it.w ?? Math.max(4, it.str.length * 3.5); // ancho real o aproximado del texto
    const last = cells[cells.length - 1];
    if (last && it.x - last.end < gap) { last.str += (it.x - last.end > 1.5 ? ' ' : '') + it.str; last.end = it.x + w; }
    else cells.push({ x: it.x, end: it.x + w, str: it.str });
  }
  return cells.map(c => c.str.trim()).filter(Boolean);
}

/**
 * Líneas del PDF → tabla. Si encuentra la fila de encabezados (Fecha, Descripción, Valor…), cada texto se
 * pone en la columna del encabezado más cercano por su posición; si no, se separa por los huecos.
 */
export function linesToTable(lines: PdfLine[]): string[][] {
  // Encabezado: una línea con "fecha" y al menos otra columna conocida
  let header: { x: number; label: string }[] | null = null;
  let headerKey = '';
  let headerAt = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = splitCellsWithX(lines[i]);
    const hasDate = cells.some(c => HEADER_RE.test(c.label));
    const known = cells.filter(c => HEADER_COL_RE.test(c.label)).length;
    if (hasDate && known >= 2) { header = cells; headerKey = cells.map(c => c.label.toLowerCase()).join('|'); headerAt = i; break; }
  }
  if (!header) return lines.map(l => splitByGaps(l)).filter(r => r.length);

  const cols = header;
  const table: string[][] = [cols.map(c => c.label)];
  // Lo que está antes del encabezado (título, nombre, periodo) no son movimientos
  for (const ln of lines.slice(headerAt + 1)) {
    const cells = splitCellsWithX(ln);
    if (!cells.length) continue;
    if (cells.map(c => c.label.toLowerCase()).join('|') === headerKey) continue; // encabezado repetido en cada página
    const row = cols.map(() => '');
    for (const c of cells) {
      // la columna cuyo inicio está más cerca (por la izquierda) del texto; los valores suelen ir alineados a la derecha
      let best = 0, bestD = Infinity;
      cols.forEach((h, i) => { const d = Math.abs(c.x - h.x); if (d < bestD) { best = i; bestD = d; } });
      row[best] = row[best] ? `${row[best]} ${c.label}` : c.label;
    }
    if (row.some(Boolean)) table.push(row);
  }
  return table;
}

function splitCellsWithX(line: PdfLine, gap = 14): { x: number; label: string }[] {
  const items = [...line].sort((a, b) => a.x - b.x);
  const cells: { x: number; end: number; label: string }[] = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    const w = it.w ?? Math.max(4, it.str.length * 3.5);
    const last = cells[cells.length - 1];
    if (last && it.x - last.end < gap) { last.label += (it.x - last.end > 1.5 ? ' ' : '') + it.str; last.end = it.x + w; }
    else cells.push({ x: it.x, end: it.x + w, label: it.str });
  }
  return cells.map(c => ({ x: c.x, label: c.label.trim() })).filter(c => c.label);
}

// ── Lectura del PDF con pdf.js (cargado desde cdnjs solo cuando se necesita) ─────────────────────
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function loadPdfJs(): Promise<any> {
  const w = window as any;
  if (w.pdfjsLib) return w.pdfjsLib;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS; s.async = true;
    s.onload = () => resolve(); s.onerror = () => reject(new Error('pdfjs'));
    document.head.appendChild(s);
  });
  w.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
  return w.pdfjsLib;
}

export type PdfReadResult = { ok: true; table: string[][] } | { ok: false; reason: 'password' | 'wrong-password' | 'failed' | 'empty' };

/** Lee todas las páginas y devuelve la tabla. Con clave equivocada o faltante dice cuál fue el problema. */
export async function readPdfTable(file: File, password?: string): Promise<PdfReadResult> {
  let pdfjs: any;
  try { pdfjs = await loadPdfJs(); } catch { return { ok: false, reason: 'failed' }; }
  const data = new Uint8Array(await file.arrayBuffer());
  let doc: any;
  try {
    doc = await pdfjs.getDocument({ data, password: password || undefined }).promise;
  } catch (e: any) {
    if (e?.name === 'PasswordException') return { ok: false, reason: password ? 'wrong-password' : 'password' };
    return { ok: false, reason: 'failed' };
  }
  const lines: PdfLine[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Agrupa por altura (y): textos con la misma y (±2) forman una línea; de arriba hacia abajo
    const byY = new Map<number, PdfLine>();
    for (const it of content.items as any[]) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5];
      const key = Array.from(byY.keys()).find(k => Math.abs(k - y) <= 2) ?? y;
      byY.set(key, [...(byY.get(key) || []), { x, str: it.str, w: it.width }]);
    }
    Array.from(byY.entries()).sort((a, b) => b[0] - a[0]).forEach(([, ln]) => lines.push(ln));
  }
  const table = linesToTable(lines);
  return table.length > 1 ? { ok: true, table } : { ok: false, reason: 'empty' };
}
