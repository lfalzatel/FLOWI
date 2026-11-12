'use client';
import { showLimit, usePlan, usePlanGate } from '@/lib/plans';
import { useInvestments } from '@/hooks/useInvestments';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Camera, Info } from 'lucide-react';
import { FundReading, getAiKey, readFundsWithAi, readSavingsWithAi } from '@/lib/aiAssist';
import { DictateButton } from '@/components/forms/DictateButton';
import { ReadingTips } from '@/components/forms/ReadingTips';
import { parseInvestmentSpeech } from '@/lib/formDictation';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { AccountPicker } from '@/components/accounts/AccountPicker';
import { BankField, BankPickerSheet } from '@/components/accounts/BankPickerSheet';
import { formatMoneyInput, parseMoneyInput } from '@/components/accounts/AccountModals';
import { Investment, InvestmentKind, addInvestment, updateInvestment } from '@/lib/firestore';
import { KIND_INFO, dayKey } from '@/lib/investments';
import { formatCurrency } from '@/lib/format';

// Ahorro que paga intereses (Nu, Lulo…), acciones y fondos (Trii, tyba…) y pensión voluntaria.
// Los CDT tienen su propio formulario (InvestmentFormModal).

const PLACES: Record<Exclude<InvestmentKind, 'cdt'>, string[]> = {
  ahorro: ['Nu', 'Lulo Bank', 'Pibank', 'Ualá', 'RappiPay', 'Nequi', 'Bancolombia', 'Davivienda', 'BBVA'],
  fondo: ['Trii', 'tyba', 'Bancolombia', 'Davivienda', 'BBVA', 'Fiduciaria Bogotá', 'Credicorp Capital', 'Acciones y Valores'],
  pension: ['Porvenir', 'Protección', 'Colfondos', 'Skandia'],
};

const parseRate = (s: string) => Number(String(s).replace(',', '.')) || 0;

type SavingsFormProps = {
  kind: Exclude<InvestmentKind, 'cdt'>; investment?: Investment | null; onClose: () => void; onDelete?: (inv: Investment) => void;
};

// Plan gratis: hasta 2 inversiones o ahorros activos
export function SavingsFormModal(props: SavingsFormProps) {
  const { investments, loading } = useInvestments();
  const ok = usePlanGate('investments', investments.filter(i => i.status === 'activo').length, loading, !!props.investment, props.onClose);
  return ok ? <SavingsFormModalInner {...props} /> : null;
}

function SavingsFormModalInner({ kind, investment, onClose, onDelete }: SavingsFormProps) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const hasAccounts = accounts.some(a => !a.archived);
  const isSavings = kind === 'ahorro';
  const isFund = kind === 'fondo';
  const { investments } = useInvestments();
  const { canAdd } = usePlan();
  const [assetType, setAssetType] = useState<'fondo' | 'acciones'>(investment?.assetType || 'fondo');
  const [symbol, setSymbol] = useState(investment?.symbol || '');
  const [units, setUnits] = useState(investment?.units ? String(investment.units).replace('.', ',') : '');
  const [dividends, setDividends] = useState(investment?.dividends ? formatMoneyInput(investment.dividends) : '');
  const [yearReturn, setYearReturn] = useState(investment?.yearReturn ? String(investment.yearReturn).replace('.', ',') : '');
  const [found, setFound] = useState<FundReading[]>([]); // varias inversiones leídas de una captura
  const isStock = isFund && assetType === 'acciones';

  const [bank, setBank] = useState(investment?.bank || '');
  const [bankSheet, setBankSheet] = useState(false);
  const [note, setNote] = useState(investment?.note || '');
  const [amount, setAmount] = useState(investment ? formatMoneyInput(investment.amount) : '');
  const [current, setCurrent] = useState(investment?.currentValue ? formatMoneyInput(investment.currentValue) : '');
  const [rate, setRate] = useState(investment?.rateEA ? String(investment.rateEA).replace('.', ',') : '');
  const [from, setFrom] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const amountN = parseMoneyInput(amount);
  const needsFrom = !investment && hasAccounts;
  const canSave = bank.trim().length > 0 && amountN > 0 && (!isSavings || parseRate(rate) > 0) && (!needsFrom || from !== undefined) && !saving;

  // Llenar desde capturas de la app (IA gratuita, la misma de los recibos y los CDT)
  const shotsRef = useRef<HTMLInputElement>(null);
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'no-key' | 'error'>('idle');
  const [aiMsg, setAiMsg] = useState('');
  // Dictado: "Cajita de Nu con 2 millones al 9 %" o "fondo en Skandia, invertí 3 millones y ya tiene 3,4"
  const applySpeech = (text: string) => {
    const list = (xs: unknown[]) => { const f = xs.filter((x): x is string => typeof x === 'string' && !!x); return f.length ? `Llené: ${f.join(', ')}. Revisa antes de guardar.` : 'No entendí los datos. Prueba con el ejemplo o escríbelos.'; };
    const d = parseInvestmentSpeech(text);
    if (d.bank) setBank(d.bank);
    if (d.amount) setAmount(formatMoneyInput(d.amount));
    if (d.current) setCurrent(formatMoneyInput(d.current));
    if (d.rateEA) setRate(String(d.rateEA).replace('.', ','));
    return list([d.bank && `entidad (${d.bank})`, d.amount && 'monto', d.current && 'saldo actual', d.rateEA && 'tasa']);
  };

  async function readShots(files: File[]) {
    if (!files.length) return;
    setAiState('loading');
    setAiMsg('');
    setFound([]);
    if (isFund) {
      const rf = await readFundsWithAi(files);
      if (!rf.ok) {
        setAiState(rf.reason === 'no-key' ? 'no-key' : 'error');
        setAiMsg(rf.reason === 'unreadable' ? 'No pude leer los datos. Prueba con la captura donde se vea lo que vale hoy y lo depositado.'
          : rf.reason === 'no-model' ? 'Ahora no hay un modelo gratuito que lea imágenes. Inténtalo más tarde.'
          : 'La IA no respondió a tiempo. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }
      if (rf.items.length > 1 && !investment) {
        setFound(rf.items);
        setAiState('done');
        setAiMsg(`Encontré ${rf.items.length} inversiones en la captura. Guárdalas todas o elige una para revisarla.`);
        return;
      }
      fillFrom(rf.items[0]);
      setAiState('done');
      setAiMsg(!rf.items[0].invested ? 'Listo. Revisa y completa lo que has depositado.' : 'Listo. Revisa los datos antes de guardar.');
      return;
    }
    const r = await readSavingsWithAi(files, kind);
    if (!r.ok) {
      setAiState(r.reason === 'no-key' ? 'no-key' : 'error');
      setAiMsg(r.reason === 'unreadable' ? 'No pude leer los datos. Prueba con una captura donde se vea el saldo y, si la hay, la tasa.'
        : r.reason === 'no-model' ? 'Ahora no hay un modelo gratuito que lea imágenes. Inténtalo más tarde.'
        : 'La IA no respondió a tiempo. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    const d = r.data;
    if (d.bank) setBank(d.bank);
    if (isSavings) {
      if (d.balance) setAmount(formatMoneyInput(String(d.balance)));
      if (d.rateEA) setRate(String(d.rateEA).replace('.', ','));
    } else {
      // Fondos y pensión: lo invertido y el valor actual (si solo hay uno, se usa como ambos)
      if (d.invested || d.balance) setAmount(formatMoneyInput(String(d.invested || d.balance)));
      if (d.balance) setCurrent(formatMoneyInput(String(d.balance)));
    }
    const missing = isSavings
      ? [!d.balance && 'saldo', !d.rateEA && 'tasa E.A.'].filter(Boolean)
      : [!d.balance && 'valor actual', !d.invested && 'lo invertido'].filter(Boolean);
    setAiState('done');
    setAiMsg(missing.length ? `Listo. Revisa y completa: ${missing.join(', ')}.` : 'Listo. Revisa los datos antes de guardar.');
  }

  function fillFrom(it: FundReading) {
    if (it.bank) setBank(it.bank);
    if (it.name) setNote(it.name);
    if (it.assetType) setAssetType(it.assetType);
    if (it.invested || it.value) setAmount(formatMoneyInput(String(it.invested || it.value)));
    if (it.value) setCurrent(formatMoneyInput(String(it.value)));
    if (it.symbol) setSymbol(it.symbol);
    if (it.units) setUnits(String(it.units).replace('.', ','));
    if (it.dividends) setDividends(formatMoneyInput(String(it.dividends)));
    if (it.yearReturn) setYearReturn(String(it.yearReturn).replace('.', ','));
    setFound([]);
  }

  const fundFields = (it: { assetType: 'fondo' | 'acciones'; symbol?: string; units?: number; dividends?: number; yearReturn?: number }) => ({
    assetType: it.assetType,
    symbol: it.assetType === 'acciones' && it.symbol ? it.symbol.trim().toUpperCase().slice(0, 12) : null,
    units: it.assetType === 'acciones' && it.units ? it.units : null,
    dividends: it.assetType === 'acciones' && it.dividends ? it.dividends : null,
    yearReturn: it.assetType === 'fondo' && it.yearReturn ? it.yearReturn : null,
  });

  // Guardar de una vez todas las inversiones leídas de la captura (respeta el límite del plan gratis)
  async function saveAll() {
    if (!user || !found.length) return;
    setSaving(true);
    setError('');
    const now = new Date();
    let active = investments.filter(i => i.status === 'activo').length;
    let saved = 0;
    try {
      for (const it of found) {
        if (!canAdd('investments', active)) { showLimit('investments'); break; }
        const invested = it.invested || it.value || 0;
        if (!invested) continue;
        await addInvestment({
          userId: user.uid, kind: 'fondo', status: 'activo', closedAt: null, history: [], payouts: [],
          bank: (it.bank || bank || 'Inversión').trim().slice(0, 30), note: (it.name || '').slice(0, 40), amount: invested,
          rateEA: 0, currentValue: it.value || invested, valueAt: now.toISOString(),
          ...fundFields({ assetType: it.assetType || 'fondo', symbol: it.symbol, units: it.units, dividends: it.dividends, yearReturn: it.yearReturn }),
          startDate: dayKey(now), maturityDate: '', bankInterest: null, withholdingPct: 0, autoRenew: false,
          fundings: [{ at: now.toISOString(), amount: invested, accountId: from ?? null, kind: 'apertura' }],
        });
        active++;
        saved++;
      }
      if (saved) onClose();
      else setSaving(false);
    } catch (err) {
      console.error('Error saving investments:', err);
      setError('No se pudieron guardar. Revisa tu conexión e inténtalo de nuevo.');
      setSaving(false);
    }
  }

  async function save() {
    if (!user || !canSave) return;
    setSaving(true);
    setError('');
    const now = new Date();
    const currentN = parseMoneyInput(current);
    const base = {
      bank: bank.trim().slice(0, 30), note: note.trim(), amount: amountN,
      rateEA: isSavings ? parseRate(rate) : 0,
      currentValue: isSavings ? null : (currentN > 0 ? currentN : amountN),
      valueAt: isSavings ? null : now.toISOString(),
      ...(isFund ? fundFields({
        assetType, symbol, units: Number(units.replace(',', '.')) || undefined,
        dividends: parseMoneyInput(dividends) || undefined, yearReturn: parseRate(yearReturn) || undefined,
      }) : {}),
    };
    try {
      if (investment?.id) {
        await updateInvestment(investment.id, base);
      } else {
        await addInvestment({
          userId: user.uid, kind, status: 'activo', closedAt: null, history: [], payouts: [],
          ...base, startDate: dayKey(now), maturityDate: '', bankInterest: null, withholdingPct: 0, autoRenew: false,
          fundings: [{ at: now.toISOString(), amount: amountN, accountId: from ?? null, kind: 'apertura' }],
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving investment:', err);
      setError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;
  const lbl = `${isTech ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`;
  const input = `w-full bg-glass border px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none ${isTech ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`;
  const hint = 'text-[11px] text-text-muted mt-1.5 leading-snug';
  const info = KIND_INFO[kind];

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
      <div className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[88dvh] flex flex-col overflow-hidden glass-dropdown ${isTech ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}>
        <div className={`shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-3 ${isTech ? 'border-b border-accent/20' : ''}`}>
          <div>
            <h2 className={isTech ? 'font-bold text-xl text-accent uppercase' : 'font-syne font-bold text-xl text-text-primary'}>{investment ? 'Editar' : 'Nuevo'}: {info.short}</h2>
            <p className="text-[11px] text-text-muted">{info.examples}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={isTech ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-3 pb-5 space-y-5">
          {!investment && (
            <DictateButton isTech={isTech} onText={applySpeech}
                           example={isFund ? '"Fondo en Skandia, invertí 3 millones y ya tiene 3,4 millones"' : isSavings ? '"Cajita de Nu con 2 millones al 9 %"' : '"Pensión en Porvenir con 15 millones"'} />
          )}
          {!investment && (
            <div>
              <input ref={shotsRef} type="file" accept="image/*" multiple className="hidden"
                     onChange={(e) => { const fs = Array.from(e.target.files || []); e.target.value = ''; readShots(fs); }} />
              {aiState === 'loading' ? <ReadingTips isTech={isTech} label="Leyendo las capturas…" /> : (
              <button type="button"
                      onClick={() => (getAiKey() ? shotsRef.current?.click() : setAiState('no-key'))}
                      className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold border transition-all active:scale-[0.98] disabled:opacity-60 ${isTech ? 'rounded-none border-accent/40 text-accent uppercase text-xs' : 'rounded-xl border-accent/40 text-accent bg-accent/5 hover:bg-accent/10'}`}>
                <Camera className="w-4 h-4" />
                Llenar desde captura de la app
              </button>
              )}
              <p className={hint}>
                {aiState === 'no-key'
                  ? <>Para leer capturas necesitas la IA gratuita (gratis siempre). <a href="/configuracion" className="text-accent font-semibold underline">Conéctala en Configuración</a>.</>
                  : aiMsg
                    ? <span className={aiState === 'error' ? 'text-red-400' : 'text-text-secondary'}>{aiMsg}</span>
                    : isFund
                      ? 'Sube la captura del portafolio: puedo leer varias inversiones a la vez. No se guardan números de cuenta.'
                      : 'Sube la captura donde se vea el saldo (y la tasa si aparece). No se guardan números de cuenta.'}
              </p>
              {found.length > 1 && (
                <div className={`mt-3 border divide-y ${isTech ? 'rounded-none border-accent/30 divide-accent/20' : 'rounded-xl border-glass-border divide-glass-border'}`}>
                  {found.map((it, i) => {
                    const gain = it.value && it.invested ? it.value - it.invested : null;
                    return (
                      <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{it.name || it.symbol || `Inversión ${i + 1}`}</p>
                          <p className="text-[11px] text-text-muted truncate">
                            {it.assetType === 'acciones' ? `Acciones${it.units ? ` · ${it.units}` : ''}` : 'Fondo'}
                            {it.value ? ` · vale ${formatCurrency(it.value, 'COP')}` : ''}
                            {gain !== null ? ` · ${gain >= 0 ? '+' : '−'}${formatCurrency(Math.abs(gain), 'COP')}` : ''}
                          </p>
                        </div>
                        <button type="button" onClick={() => fillFrom(it)} className="text-xs font-semibold text-accent shrink-0">Revisar</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isFund && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(['fondo', 'acciones'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setAssetType(t)}
                          className={`py-2.5 text-sm font-semibold border transition-colors ${isTech ? 'rounded-none' : 'rounded-xl'} ${assetType === t ? 'border-accent bg-accent/10 text-accent' : 'border-glass-border text-text-secondary hover:bg-glass'}`}>
                    {t === 'fondo' ? 'Fondo de inversión' : 'Acciones o ETF'}
                  </button>
                ))}
              </div>
              <div className={`flex gap-2 p-3 text-[11px] leading-relaxed text-text-secondary border ${isTech ? 'rounded-none border-accent/20 bg-accent/5' : 'rounded-xl border-sky-500/20 bg-sky-500/5'}`}>
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <p>
                  {isStock
                    ? 'Las acciones no tienen tasa: valen lo que valga la acción cada día y a veces pagan dividendos. Anota lo que invertiste y lo que valen hoy (está en la app) y te muestro si ganas o pierdes.'
                    : 'Los fondos no tienen una tasa fija como un CDT: su valor sube y baja cada día. Anota lo que has depositado y lo que vale hoy (está en la app) y te muestro tu ganancia. La rentabilidad del último año es solo de referencia, no garantiza lo que vas a ganar.'}
                </p>
              </div>
            </>
          )}
          <div>
            <span className={lbl}>{kind === 'fondo' ? 'Plataforma o entidad' : 'Entidad'}</span>
            <BankField value={bank} placeholder="Elegir" onClick={() => setBankSheet(true)} />
            {bankSheet && (
              <BankPickerSheet title={kind === 'fondo' ? '¿Dónde inviertes?' : '¿Dónde está esta plata?'} selected={bank ? [bank] : []}
                               onlyBanks={kind !== 'ahorro'} allowCustom extra={PLACES[kind]} favorites={PLACES[kind]}
                               onChange={(v) => setBank(v[0] || '')} onClose={() => setBankSheet(false)} />
            )}
          </div>

          <div>
            <label htmlFor="sv-note" className={lbl}>Nombre (opcional)</label>
            <input id="sv-note" value={note} maxLength={40} onChange={(e) => setNote(e.target.value)} className={input}
                   placeholder={isSavings ? 'Ej: Cajita viaje, fondo de emergencia' : kind === 'fondo' ? 'Ej: Acciones Ecopetrol, ETF' : 'Ej: Pensión voluntaria'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sv-amount" className={lbl}>{isSavings ? (investment ? 'Saldo inicial' : 'Saldo de hoy') : isFund ? 'Lo que has depositado' : 'Lo que has invertido'}</label>
              <input id="sv-amount" type="text" inputMode="decimal" placeholder="$ 0" value={amount}
                     onChange={(e) => setAmount(formatMoneyInput(e.target.value))} className={`${input} font-bold`} />
            </div>
            {isSavings ? (
              <div>
                <label htmlFor="sv-rate" className={lbl}>Tasa E.A. (%)</label>
                <input id="sv-rate" type="text" inputMode="decimal" placeholder="9,25" value={rate}
                       onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ''))} className={`${input} font-bold`} />
              </div>
            ) : (
              <div>
                <label htmlFor="sv-current" className={lbl}>{isFund ? 'Lo que vale hoy' : 'Valor actual'}</label>
                <input id="sv-current" type="text" inputMode="decimal" placeholder="Igual al invertido" value={current}
                       onChange={(e) => setCurrent(formatMoneyInput(e.target.value))} className={input} />
              </div>
            )}
          </div>
          <p className={`${hint} -mt-3`}>
            {isSavings
              ? 'Calculo los intereses día a día con la tasa. Si el saldo de la app no cuadra, usa "Ajustar saldo".'
              : 'El valor sube y baja: actualízalo cuando quieras con lo que dice la app y te muestro cuánto ganas o pierdes.'}
          </p>

          {isStock && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="sv-symbol" className={lbl}>Símbolo</label>
                <input id="sv-symbol" value={symbol} maxLength={12} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className={input} placeholder="CELSIA" />
              </div>
              <div>
                <label htmlFor="sv-units" className={lbl}>N.º acciones</label>
                <input id="sv-units" type="text" inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value.replace(/[^\d.,]/g, ''))} className={input} placeholder="14" />
              </div>
              <div>
                <label htmlFor="sv-div" className={lbl}>Dividendos</label>
                <input id="sv-div" type="text" inputMode="decimal" value={dividends} onChange={(e) => setDividends(formatMoneyInput(e.target.value))} className={input} placeholder="$ 0" />
              </div>
            </div>
          )}
          {isFund && !isStock && (
            <div>
              <label htmlFor="sv-yr" className={lbl}>Rentabilidad último año (%) · opcional</label>
              <input id="sv-yr" type="text" inputMode="decimal" value={yearReturn} onChange={(e) => setYearReturn(e.target.value.replace(/[^\d.,-]/g, ''))} className={input} placeholder="26,22" />
              <p className={hint}>Solo para que la recuerdes; la ganancia se calcula con el valor de hoy.</p>
            </div>
          )}

          {needsFrom && (
            <AccountPicker accounts={accounts} value={from} onChange={setFrom} label="¿De dónde sale la plata?" noneLabel="Ya la tenía ahí"
                           hint="Si sale de una cuenta, la descuento de su saldo y de lo que puedes gastar este mes (es ahorro, no gasto)." />
          )}

          {error && <p className="text-xs text-[var(--red)]">{error}</p>}
          {investment && onDelete && (
            <button type="button" onClick={() => onDelete(investment)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[var(--red)] border border-red-500/30 hover:bg-red-500/10 ${isTech ? 'rounded-none uppercase' : 'rounded-xl'}`}>
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          )}
        </div>

        <div className={`shrink-0 px-5 pt-3 pb-4 border-t ${isTech ? 'bg-deep border-accent/20' : 'bg-card border-glass-border'}`}>
          {found.length > 1 ? (
          <button type="button" disabled={saving || (needsFrom && from === undefined)} onClick={saveAll}
                  className={`w-full py-3.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTech ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : 'rounded-xl bg-accent text-white'}`}>
            {saving ? 'Guardando...' : `Guardar las ${found.length} inversiones`}
          </button>
          ) : (
          <button type="button" disabled={!canSave} onClick={save}
                  className={`w-full py-3.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTech ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : 'rounded-xl bg-accent text-white'}`}>
            {saving ? 'Guardando...' : investment ? 'Guardar cambios' : 'Guardar'}
          </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
