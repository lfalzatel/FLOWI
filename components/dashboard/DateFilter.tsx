'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getISOWeekString, formatFilterText, navigateFilter } from '@/lib/dateUtils';

type FilterType = 'all' | 'month' | 'week' | 'day';

interface Props {
  filterType: FilterType;
  filterValue: string;
  onChangeType: (type: FilterType) => void;
  onChangeValue: (value: string) => void;
}

export function DateFilter({ filterType, filterValue, onChangeType, onChangeValue }: Props) {
  const handleTypeChange = (type: FilterType) => {
    onChangeType(type);
    if (type === 'all') return;
    
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

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Pestañas superiores */}
      <div className="flex items-center p-1 bg-[#FFD6EB]/10 rounded-full w-full max-w-sm mx-auto shadow-inner">
        {(['all', 'month', 'week', 'day'] as FilterType[]).map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`flex-1 py-2 text-[11px] font-bold tracking-wide transition-all rounded-full ${
              filterType === type 
                ? 'bg-white text-[#D10074] shadow-md' 
                : 'text-[#D10074]/70 hover:text-[#D10074]'
            }`}
          >
            {type === 'all' ? 'TODO' : type === 'month' ? 'MES' : type === 'week' ? 'SEMANA' : 'HOY'}
          </button>
        ))}
      </div>

      {/* Navegador inferior (oculto si es Todo) */}
      {filterType !== 'all' && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-full w-full max-w-sm mx-auto shadow-sm border border-[#FFD6EB]">
          <button 
            onClick={handlePrev}
            className="p-1 rounded-full hover:bg-black/5 active:scale-95 transition-all text-black/60"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="font-semibold text-[13px] text-black">
            {formatFilterText(filterType, filterValue)}
          </span>

          <button 
            onClick={handleNext}
            className="p-1 rounded-full hover:bg-black/5 active:scale-95 transition-all text-black/60"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
