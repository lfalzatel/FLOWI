export function getISOWeekString(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// Parses "YYYY-Www" and returns the Monday of that week
export function getDateFromISOWeek(weekStr: string): Date {
  const [yearStr, weekPart] = weekStr.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart, 10);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}

export function formatFilterText(type: string, value: string): string {
  if (type === 'all') return 'Historico Completo';
  
  if (type === 'month') {
    const [y, m] = value.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  }
  
  if (type === 'week') {
    const startOfWeek = getDateFromISOWeek(value);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startMonth = startOfWeek.toLocaleDateString('es-ES', { month: 'short' });
    const endMonth = endOfWeek.toLocaleDateString('es-ES', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${startOfWeek.getDate()} al ${endOfWeek.getDate()} de ${startMonth.replace(/^\w/, c => c.toUpperCase())}`;
    } else {
      return `${startOfWeek.getDate()} ${startMonth} al ${endOfWeek.getDate()} ${endMonth}`;
    }
  }
  
  if (type === 'day') {
    const [y, m, d] = value.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const today = new Date();
    today.setHours(0,0,0,0);
    const dateZero = new Date(date);
    dateZero.setHours(0,0,0,0);
    
    const diff = (today.getTime() - dateZero.getTime()) / 86400000;
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff === -1) return 'Mañana';
    
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/^\w/, c => c.toUpperCase());
  }
  
  return value;
}

export function navigateFilter(type: string, value: string, direction: 'prev' | 'next'): string {
  const dir = direction === 'next' ? 1 : -1;

  if (type === 'month') {
    const [y, m] = value.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1 + dir, 1);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  
  if (type === 'week') {
    const d = getDateFromISOWeek(value);
    d.setDate(d.getDate() + (dir * 7));
    return getISOWeekString(d);
  }
  
  if (type === 'day') {
    const [y, m, dNum] = value.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(dNum) + dir);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  return value;
}
