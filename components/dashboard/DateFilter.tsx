'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getISOWeekString, formatFilterText, navigateFilter } from '@/lib/dateUtils';
import { Transaction } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';

type FilterType = 'all' | 'month' | 'week' | 'day';

interface Props {
  filterType: FilterType;
  filterValue: string;
  onChangeType: (type: FilterType) => void;
  onChangeValue: (value: string) => void;
  transactions?: Transaction[];
}

export function DateFilter({ filterType, filterValue, onChangeType, onChangeValue, transactions = [] }: Props) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const handleTypeChange = (type: FilterType) => {
    onChangeType(type);
    if (type === 'all') {
      setShowCalendar(false);
      return;
    }
    
    if (type === 'day') {
      setShowCalendar(true);
      setCalendarMonth(new Date()); // reset to current month
    } else {
      setShowCalendar(false);
    }
    
    const now = new Date();
    if (type === 'month') {
      onChangeValue(now.toISOString().split('T')[0].substring(0, 7));
    } else if (type === 'week') {
      onChangeValue(getISOWeekString(now));
    } else if (type === 'day') {
      onChangeValue(now.toISOString().split('T')[0]);
    }
  };

  const handlePrev = () => {
    if (filterType === 'all') return;
    onChangeValue(navigateFilter(filterType, filterValue, 'prev'));
  };

  const handleNext = () => {
    if (filterType === 'all') return;
    onChangeValue(navigateFilter(filterType, filterValue, 'next'));
  };

  // --- CALENDAR LOGIC ---
  const handleCalendarPrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleCalendarNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDaySelect = (d: Date) => {
    // Para evitar desfases por zona horaria al hacer toISOString
    const localStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    onChangeType('day');
    onChangeValue(localStr);
    setShowCalendar(false);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 = Lunes, 6 = Domingo
  };

  const currentYear = calendarMonth.getFullYear();
  const currentMonth = calendarMonth.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDay }, (_, i) => i);

  // Construir mapa de actividad para el heatmap
  const activityMap = new Map<string, { gastos: number, ingresos: number, total: number }>();
  let maxTotal = 1; // para evitar división por cero en el heatmap

  transactions.forEach(t => {
    const d = t.date instanceof Timestamp ? t.date.toDate() : new Date(t.date as any);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const dateKey = d.getDate().toString();
      const current = activityMap.get(dateKey) || { gastos: 0, ingresos: 0, total: 0 };
      if (t.type === 'gasto') current.gastos += t.amount;
      if (t.type === 'ingreso') current.ingresos += t.amount;
      current.total += t.amount;
      activityMap.set(dateKey, current);
      if (current.total > maxTotal) maxTotal = current.total;
    }
  });

  return (
    <div className="flex flex-col gap-3 mb-6 relative z-40">
      {/* Pestañas superiores */}
      <div 
        className="relative flex items-center p-1 w-full max-w-sm mx-auto shadow-2xl shadow-black/10 rounded-[28px] bg-glass backdrop-blur-3xl border border-glass-border"
      >
        <div className="absolute inset-0 rounded-[28px] pointer-events-none overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>

        <div className="relative z-10 flex w-full gap-1">
          {(['all', 'month', 'week', 'day'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                if (type === 'day' && filterType === 'day') {
                  setShowCalendar(true); // Toggle on
                } else {
                  handleTypeChange(type);
                }
              }}
              className={`flex-1 py-2 text-[11px] font-bold tracking-wide transition-all rounded-[24px] ${
                filterType === type 
                  ? 'bg-accent text-black shadow-md' 
                  : 'text-accent hover:opacity-80'
              }`}
            >
              {type === 'all' ? 'TODO' : type === 'month' ? 'MES' : type === 'week' ? 'SEMANA' : 'DÍA'}
            </button>
          ))}
        </div>
      </div>

      {/* Navegador inferior (oculto si es Todo) */}
      {filterType !== 'all' && (
        <div className="flex items-center justify-between px-4 py-3 bg-card rounded-full w-full max-w-sm mx-auto border border-glass-border mt-2 shadow-sm">
          <button 
            onClick={handlePrev}
            className="p-1 rounded-full hover:bg-glass-hover active:scale-95 transition-all text-text-secondary"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="font-semibold text-[13px] text-accent">
            {formatFilterText(filterType, filterValue)}
          </span>

          <button 
            onClick={handleNext}
            className="p-1 rounded-full hover:bg-glass-hover active:scale-95 transition-all text-text-secondary"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Heatmap Calendar Modal */}
      {showCalendar && (
        <div className="absolute top-[100%] left-0 right-0 z-50 mt-2 bg-card rounded-3xl p-5 shadow-2xl border border-glass-border animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handleCalendarPrevMonth} className="p-2 rounded-full hover:bg-glass-hover text-text-primary">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-sm text-text-primary capitalize">
              {calendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h4>
            <div className="flex items-center gap-1">
              <button onClick={handleCalendarNextMonth} className="p-2 rounded-full hover:bg-glass-hover text-text-primary">
                <ChevronRight className="w-5 h-5" />
              </button>
              <button onClick={() => setShowCalendar(false)} className="p-2 rounded-full hover:bg-glass-hover text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['L','M','X','J','V','S','D'].map(day => (
              <div key={day} className="text-[10px] font-bold text-text-secondary">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {blanksArray.map(b => <div key={`blank-${b}`} className="aspect-square"></div>)}
            
            {daysArray.map(day => {
              const activity = activityMap.get(day.toString());
              let bgOpacity = 0;
              if (activity) {
                // calculamos intensidad del 20% al 100% basada en el máximo del mes
                bgOpacity = 0.2 + (0.8 * (activity.total / maxTotal));
              }

              return (
                <button
                  key={day}
                  onClick={() => handleDaySelect(new Date(currentYear, currentMonth, day))}
                  className="relative aspect-square rounded-xl flex items-center justify-center text-xs font-semibold hover:ring-2 hover:ring-[#D10074] transition-all"
                  style={{
                    backgroundColor: activity ? `rgba(209, 0, 116, ${bgOpacity})` : 'var(--glass)',
                    color: activity && bgOpacity > 0.5 ? '#fff' : 'var(--text-primary)'
                  }}
                >
                  {day}
                  {activity && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {activity.ingresos > 0 && <div className="w-1 h-1 rounded-full bg-[#00E5A0]" />}
                      {activity.gastos > 0 && <div className="w-1 h-1 rounded-full bg-red-400" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-medium text-text-secondary">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-accent" /> Ingresos</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--red)]" /> Gastos</div>
          </div>
        </div>
      )}
    </div>
  );
}
