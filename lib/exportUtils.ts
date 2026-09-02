import { Transaction } from './firestore';
import { formatCurrency } from './format';

/**
 * Exporta las transacciones a un archivo CSV optimizado para Microsoft Excel y Google Sheets.
 */
export function exportTransactionsToCSV(transactions: Transaction[], currency: string = 'COP', periodName: string = 'Mes') {
  if (!transactions || transactions.length === 0) {
    alert('No hay transacciones para exportar en este período.');
    return;
  }

  // BOM para que Excel reconozca codificación UTF-8 con tildes y caracteres en español
  let csvContent = '\uFEFF';
  csvContent += 'Fecha;Tipo;Categoría;Descripción;Monto;Gasto Fijo\n';

  transactions.forEach(t => {
    let dateStr = '';
    if (t.date) {
      if (t.date instanceof Date) {
        dateStr = t.date.toISOString().split('T')[0];
      } else if (typeof t.date === 'string') {
        dateStr = t.date;
      } else if ((t.date as any).toDate) {
        dateStr = (t.date as any).toDate().toISOString().split('T')[0];
      }
    }

    const typeStr = t.type === 'ingreso' ? 'Ingreso' : 'Gasto';
    const categoryStr = `"${(t.category || '').replace(/"/g, '""')}"`;
    const descStr = `"${(t.description || '').replace(/"/g, '""')}"`;
    const amountStr = t.amount || 0;
    const isFixedStr = t.isFixed ? 'Sí' : 'No';

    csvContent += `${dateStr};${typeStr};${categoryStr};${descStr};${amountStr};${isFixedStr}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `FLOWI_Reporte_${periodName.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Genera una vista imprimible/PDF limpia de reportes contables del mes.
 */
export function printMonthlyReportPDF(
  transactions: Transaction[], 
  incomeTotal: number, 
  expenseTotal: number, 
  fixedTotal: number,
  currency: string = 'COP', 
  periodName: string = 'Mes'
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes para generar el PDF.');
    return;
  }

  const freeMoney = incomeTotal - fixedTotal;
  const netBalance = incomeTotal - expenseTotal;

  const rowsHtml = transactions.map(t => {
    let dateStr = '';
    if (t.date) {
      if (t.date instanceof Date) {
        dateStr = t.date.toLocaleDateString('es-CO');
      } else if (typeof t.date === 'string') {
        dateStr = t.date;
      } else if ((t.date as any).toDate) {
        dateStr = (t.date as any).toDate().toLocaleDateString('es-CO');
      }
    }
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${dateStr}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:${t.type === 'ingreso' ? '#10B981' : '#EF4444'}">${t.type.toUpperCase()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${t.category}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${t.description || '-'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${formatCurrency(t.amount, currency)}</td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>FLOWI - Reporte Financiero ${periodName}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #111; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10B981; padding-bottom: 15px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #10B981; }
          .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .card { background: #f9f9f9; padding: 15px; rounded: 8px; border: 1px solid #eee; }
          .card-title { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
          .card-val { font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th { text-align: left; padding: 10px; background: #f1f1f1; border-bottom: 2px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">FLOWI Gastos Personales</div>
          <div>Reporte Financiero: <strong>${periodName}</strong></div>
        </div>

        <div class="cards">
          <div class="card">
            <div class="card-title">Ingresos Totales</div>
            <div class="card-val" style="color:#10B981;">${formatCurrency(incomeTotal, currency)}</div>
          </div>
          <div class="card">
            <div class="card-title">Gastos Fijos</div>
            <div class="card-val" style="color:#F59E0B;">${formatCurrency(fixedTotal, currency)}</div>
          </div>
          <div class="card">
            <div class="card-title">Disponible Libre</div>
            <div class="card-val" style="color:#3B82F6;">${formatCurrency(freeMoney, currency)}</div>
          </div>
          <div class="card">
            <div class="card-title">Balance Neto</div>
            <div class="card-val" style="color:${netBalance >= 0 ? '#10B981' : '#EF4444'};">${formatCurrency(netBalance, currency)}</div>
          </div>
        </div>

        <h3>Detalle de Transacciones (${transactions.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th style="text-align:right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
