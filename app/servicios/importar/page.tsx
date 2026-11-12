'use client';
import { ReadingTips } from '@/components/forms/ReadingTips';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronLeft, FileSpreadsheet, Info, RefreshCw, Upload } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { addExpense } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { Cell, ColumnMap, StatementRow, buildRows, guessColumns, rowToTransaction } from '@/lib/statementImport';

const MAX_ROWS = 1000;

export default function ImportarPage() {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, refresh } = useExpenses();
  const { allCategories, expenseCategories, incomeCategories } = useCategories();
  const currency = profile?.currency || 'COP';
  const fmt = (n: number) => formatCurrency(n, currency);

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<Cell[][] | null>(null);
  const [map, setMap] = useState<ColumnMap | null>(null);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [hideDuplicates, setHideDuplicates] = useState(true);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  // Volver a armar las filas cuando cambia el archivo o las columnas elegidas
  useEffect(() => {
    if (!sheet || !map || map.date < 0 || map.description < 0) { setRows([]); return; }
    if (map.amount === null && (map.debit === null || map.credit === null)) { setRows([]); return; }
    setRows(buildRows(sheet, map, transactions, allCategories).slice(0, MAX_ROWS));
    // Las transacciones existentes solo se usan para marcar duplicados al leer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, map]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(''); setImported(null); setReading(true); setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { cellDates: true, raw: true, codepage: 65001 });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const table = XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, defval: null });
      const guess = guessColumns(table);
      setSheet(table);
      setMap(guess || { headerRow: 0, date: -1, description: -1, amount: null, debit: null, credit: null });
      if (!guess) setError('No reconocí las columnas de este archivo. Elige abajo cuál es la fecha, la descripción y el valor.');
    } catch (err) {
      console.error('Error reading statement:', err);
      setSheet(null); setMap(null);
      setError('No pude abrir el archivo. Usa un CSV o un Excel (.xlsx o .xls) descargado de tu banco.');
    } finally {
      setReading(false);
    }
  }

  const visible = rows.filter(r => !(hideDuplicates && r.duplicate));
  const selected = rows.filter(r => r.selected);
  const totalGastos = selected.filter(r => r.type === 'gasto').reduce((s, r) => s + r.amount, 0);
  const totalIngresos = selected.filter(r => r.type === 'ingreso').reduce((s, r) => s + r.amount, 0);
  const duplicates = rows.filter(r => r.duplicate).length;

  const update = (id: string, patch: Partial<StatementRow>) => setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const setAll = (value: boolean) => setRows(prev => prev.map(r => (hideDuplicates && r.duplicate ? r : { ...r, selected: value })));

  async function importSelected() {
    if (!user || !selected.length || saving) return;
    setSaving({ done: 0, total: selected.length });
    try {
      for (let i = 0; i < selected.length; i += 20) {
        await Promise.all(selected.slice(i, i + 20).map(r => addExpense({ ...rowToTransaction(r, user.uid), userId: user.uid })));
        setSaving({ done: Math.min(i + 20, selected.length), total: selected.length });
      }
      setImported(selected.length);
      setSheet(null); setMap(null); setRows([]); setFileName('');
      refresh?.();
    } catch (err) {
      console.error('Error importing statement:', err);
      setError('Se cortó la importación. Lo que alcanzó a guardarse quedó registrado; vuelve a cargar el archivo y los ya importados saldrán como duplicados.');
    } finally {
      setSaving(null);
    }
  }

  const card = isTechTheme ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const select = `w-full px-2.5 py-2 text-xs bg-black/30 border border-glass-border text-text-primary ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`;
  const headers = sheet && map ? (sheet[map.headerRow] || []).map((h, i) => String(h ?? '').trim() || `Columna ${i + 1}`) : [];
  const colSelect = (label: string, value: number | null, onChange: (v: number | null) => void, optional = false) => (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
      <select className={select} value={value ?? -1} onChange={(e) => { const v = Number(e.target.value); onChange(v < 0 ? null : v); }}>
        <option value={-1}>{optional ? '— No usar —' : '— Elegir —'}</option>
        {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
      </select>
    </label>
  );

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTechTheme ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTechTheme ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className={`text-xl font-bold ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Importar extracto</h1>
        </div>

        {imported !== null && (
          <div className={`${card} p-4 flex items-start gap-3 border-emerald-500/30`}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm text-text-secondary">
              <p className="font-semibold text-emerald-400">Se importaron {imported} movimientos.</p>
              <p>Ya los ves en tus gastos e ingresos. <Link href="/" className="text-accent font-semibold">Ir a Inicio</Link></p>
            </div>
          </div>
        )}

        {/* 1. Elegir archivo */}
        <section className={`${card} p-5 space-y-3`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0"><FileSpreadsheet className="w-5 h-5 text-accent" /></div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Sube los movimientos de tu banco</p>
              <p className="text-xs text-text-muted">CSV o Excel (.xlsx, .xls). Revisas todo antes de guardar y los que ya tenías registrados se marcan para no duplicarlos.</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden"
                 onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={reading || !!saving}
                  className={`w-full flex items-center justify-center gap-2 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase text-xs tracking-wider' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'} text-sm`}`}>
            {reading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {reading ? 'Leyendo…' : fileName ? 'Elegir otro archivo' : 'Elegir archivo'}
          </button>
          {reading && <ReadingTips isTech={isTechTheme} label="Leyendo tus movimientos…" />}
          {fileName && <p className="text-[11px] text-text-muted truncate">Archivo: {fileName}</p>}
          <details className="text-xs text-text-secondary">
            <summary className="cursor-pointer text-accent font-semibold">¿Dónde descargo mis movimientos?</summary>
            <ul className="mt-2 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li><b>Bancolombia:</b> en la Sucursal Virtual Personas (desde el computador), entra a tu cuenta, consulta los movimientos y usa la opción de descargar o exportar a Excel.</li>
              <li><b>Otros bancos:</b> busca "descargar movimientos" o "exportar" en la banca en línea; casi todos dan Excel o CSV.</li>
              <li><b>Nequi:</b> por ahora solo entrega el extracto en PDF, que aún no se puede importar. Para Nequi usa la voz o la foto del recibo.</li>
            </ul>
          </details>
        </section>

        {error && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
        )}

        {/* 2. Columnas */}
        {sheet && map && (
          <section className={`${card} p-5 space-y-3`}>
            <p className="text-sm font-semibold text-text-primary">Columnas del archivo</p>
            <p className="text-xs text-text-muted -mt-2">Las adiviné; cámbialas si algo no cuadra.</p>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Fila de encabezados</span>
              <select className={select} value={map.headerRow} onChange={(e) => setMap({ ...map, headerRow: Number(e.target.value) })}>
                {sheet.slice(0, 30).map((r, i) => <option key={i} value={i}>Fila {i + 1}: {r.filter(Boolean).slice(0, 4).join(' · ').slice(0, 50) || '(vacía)'}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {colSelect('Fecha', map.date >= 0 ? map.date : null, v => setMap({ ...map, date: v ?? -1 }))}
              {colSelect('Descripción', map.description >= 0 ? map.description : null, v => setMap({ ...map, description: v ?? -1 }))}
            </div>
            {colSelect('Valor (con signo: negativo = gasto)', map.amount, v => setMap({ ...map, amount: v }), true)}
            {map.amount === null && (
              <div className="grid grid-cols-2 gap-2">
                {colSelect('Débito / salidas', map.debit, v => setMap({ ...map, debit: v }), true)}
                {colSelect('Crédito / entradas', map.credit, v => setMap({ ...map, credit: v }), true)}
              </div>
            )}
          </section>
        )}

        {/* 3. Vista previa */}
        {rows.length > 0 && (
          <section className="space-y-3">
            <div className={`${card} p-4`}>
              <p className="text-sm text-text-secondary">
                <b className="text-text-primary">{selected.length}</b> de {rows.length} seleccionados ·
                {' '}<span className="text-[var(--red)]">gastos {fmt(totalGastos)}</span> ·
                {' '}<span className="text-accent">ingresos {fmt(totalIngresos)}</span>
              </p>
              {duplicates > 0 && (
                <label className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                  <input type="checkbox" checked={hideDuplicates} onChange={(e) => setHideDuplicates(e.target.checked)} />
                  Ocultar {duplicates} que ya tenías registrados (mismo día y valor)
                </label>
              )}
              <div className="mt-2 flex gap-3 text-xs font-semibold">
                <button type="button" onClick={() => setAll(true)} className="text-accent">Marcar todos</button>
                <button type="button" onClick={() => setAll(false)} className="text-text-muted">Desmarcar todos</button>
              </div>
            </div>

            <ul className="space-y-2">
              {visible.map(r => (
                <li key={r.id} className={`${card} p-3 ${r.selected ? '' : 'opacity-50'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={r.selected} onChange={(e) => update(r.id, { selected: e.target.checked })} className="mt-1 w-4 h-4 accent-[var(--accent)]" aria-label={`Importar ${r.description}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary truncate">{r.description}</p>
                        <button type="button" onClick={() => update(r.id, { type: r.type === 'gasto' ? 'ingreso' : 'gasto', category: r.type === 'gasto' ? 'Otros ingresos' : 'Otros' })}
                                title="Cambiar entre gasto e ingreso"
                                className={`text-sm font-bold shrink-0 ${r.type === 'gasto' ? 'text-[var(--red)]' : 'text-accent'}`}>
                          {r.type === 'gasto' ? '−' : '+'}{fmt(r.amount)}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-text-muted shrink-0">{new Date(`${r.date}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                        <select className={`${select} !py-1 !text-[11px]`} value={r.category} onChange={(e) => update(r.id, { category: e.target.value })} aria-label="Categoría">
                          {!(r.type === 'gasto' ? expenseCategories : incomeCategories).some(c => c.label === r.category) && <option value={r.category}>{r.category}</option>}
                          {(r.type === 'gasto' ? expenseCategories : incomeCategories).map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                        </select>
                      </div>
                      {r.duplicate && <p className="text-[10px] text-amber-500 mt-1">Parece que ya lo registraste.</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="sticky bottom-24 z-10">
              <button type="button" onClick={importSelected} disabled={!selected.length || !!saving}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 font-bold shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-deep border border-accent text-accent uppercase text-xs tracking-wider' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'} text-sm`}`}>
                {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Guardando {saving.done} de {saving.total}…</> : `Importar ${selected.length} movimientos`}
              </button>
            </div>
          </section>
        )}

        {sheet && map && rows.length === 0 && !error && (
          <p className="text-xs text-text-muted text-center">No encontré movimientos con fecha y valor con estas columnas. Revisa la selección de arriba.</p>
        )}
      </main>
      <BottomNav onSuccess={refresh} />
    </div>
  );
}
