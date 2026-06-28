'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Share2, FileSpreadsheet, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Transaction, Debt } from '@/lib/firestore';

interface Props {
  onClose: () => void;
  title: string;
  transactions?: Transaction[];
  debts?: Debt[];
  filterType: 'all' | 'month' | 'week' | 'day';
  filterValue: string;
}

export function ExportReportModal({ onClose, title, transactions = [], debts = [], filterType, filterValue }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  
  const [format, setFormat] = useState<'excel' | 'pdf' | 'image' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Generar datos para la previsualización según el formato seleccionado
  const handleSelectFormat = (selectedFormat: 'excel' | 'pdf' | 'image') => {
    setFormat(selectedFormat);
    setGenerating(true);
    
    // Simular generación con un pequeño delay para una sensación premium
    setTimeout(() => {
      setGenerating(false);
    }, 1000);
  };

  // Formatear Timestamp de Firebase a fecha y hora local
  const formatTimestamp = (dateValue: any) => {
    let d: Date;
    if (dateValue && typeof dateValue.toDate === 'function') {
      d = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      d = dateValue;
    } else {
      d = new Date(dateValue);
    }
    
    // Obtener fecha y hora en formato legible (ej. 27/06/2026 18:45)
    return d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  // Obtener el periodo del reporte legible
  const getPeriodString = () => {
    if (filterType === 'all') return "Historial completo";
    if (filterType === 'month') return `Mes: ${filterValue}`;
    if (filterType === 'week') return `Semana: ${filterValue}`;
    return `Día: ${filterValue}`;
  };

  // Función para exportar a CSV/Excel (Estructura de Reporte Financiero Completo)
  const exportToCSV = () => {
    let csv = "\uFEFF"; // BOM para asegurar codificación UTF-8 correcta en Excel
    const dateStr = new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    
    // Encabezado Corporativo
    csv += "FLOWI — Tu dinero en flujo\n";
    csv += `Reporte de:;${title}\n`;
    csv += `Periodo del reporte:;${getPeriodString()}\n`;
    csv += `Fecha y hora de consulta:;${dateStr}\n\n`;

    // Resumen Ejecutivo
    csv += "RESUMEN EJECUTIVO\n";
    if (debts.length > 0) {
      const pending = debts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
      const paid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
      const total = debts.reduce((sum, d) => sum + d.totalAmount, 0);
      csv += `Total Deuda original:;"${Math.round(total)}"\n`;
      csv += `Total Abonado:;"${Math.round(paid)}"\n`;
      csv += `Total Pendiente de pago:;"${Math.round(pending)}"\n\n`;
    } else {
      const totalGastos = transactions.filter(t => t.type === 'gasto').reduce((sum, t) => sum + t.amount, 0);
      const totalIngresos = transactions.filter(t => t.type === 'ingreso').reduce((sum, t) => sum + t.amount, 0);
      const balanceReal = totalIngresos - totalGastos;
      csv += `Total Ingresos:;"${Math.round(totalIngresos)}"\n`;
      csv += `Total Gastos:;"${Math.round(totalGastos)}"\n`;
      csv += `Dinero Disponible (Balance):;"${Math.round(balanceReal)}"\n\n`;
    }

    // Tabla de Datos
    csv += "DETALLE DEL REPORTE\n";
    if (debts.length > 0) {
      csv += "Concepto;Monto Total;Abonado;Deuda Pendiente;Estado\n";
      debts.forEach(d => {
        const pending = d.totalAmount - d.paidAmount;
        csv += `"${d.title}";"${Math.round(d.totalAmount)}";"${Math.round(d.paidAmount)}";"${Math.round(pending)}";"${d.status === 'paid' ? 'Liquidada' : 'Pendiente'}"\n`;
      });
    } else {
      csv += "Fecha y Hora;Categoría;Tipo;Descripción;Monto\n";
      transactions.forEach(t => {
        csv += `"${formatTimestamp(t.date)}";"${t.category}";"${t.type === 'gasto' ? 'Gasto' : 'Ingreso'}";"${t.description || ''}";"${Math.round(t.amount)}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Reporte_FLOWI_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para exportar a PDF (Impresión Corporativa Novedosa)
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    let rowsHTML = '';
    let summaryHTML = '';

    if (debts.length > 0) {
      const pending = debts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
      const paid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
      const total = debts.reduce((sum, d) => sum + d.totalAmount, 0);
      
      summaryHTML = `
        <div class="summary-card">
          <div><strong>Total Deuda:</strong> $${total.toLocaleString()}</div>
          <div><strong>Total Abonado:</strong> $${paid.toLocaleString()}</div>
          <div style="color: #e28743;"><strong>Pendiente:</strong> $${pending.toLocaleString()}</div>
        </div>
      `;

      debts.forEach(d => {
        const pending = d.totalAmount - d.paidAmount;
        rowsHTML += `
          <tr>
            <td><strong>${d.title}</strong></td>
            <td>$${d.totalAmount.toLocaleString()}</td>
            <td>$${d.paidAmount.toLocaleString()}</td>
            <td style="color: #e28743; font-weight: bold;">$${pending.toLocaleString()}</td>
            <td><span class="badge ${d.status === 'paid' ? 'badge-paid' : 'badge-pending'}">${d.status === 'paid' ? 'Liquidada' : 'Pendiente'}</span></td>
          </tr>
        `;
      });
    } else {
      const totalGastos = transactions.filter(t => t.type === 'gasto').reduce((sum, t) => sum + t.amount, 0);
      const totalIngresos = transactions.filter(t => t.type === 'ingreso').reduce((sum, t) => sum + t.amount, 0);
      const balanceReal = totalIngresos - totalGastos;

      summaryHTML = `
        <div class="summary-card">
          <div><strong>Ingresos:</strong> <span style="color: #10b981;">$${totalIngresos.toLocaleString()}</span></div>
          <div><strong>Gastos:</strong> <span style="color: #ef4444;">$${totalGastos.toLocaleString()}</span></div>
          <div><strong>Disponible:</strong> <span style="color: #10b981; font-weight: 800;">$${balanceReal.toLocaleString()}</span></div>
        </div>
      `;

      transactions.forEach(t => {
        rowsHTML += `
          <tr>
            <td style="color: #666; font-size: 11px;">${formatTimestamp(t.date)}</td>
            <td><strong>${t.category}</strong></td>
            <td><span class="badge ${t.type === 'gasto' ? 'badge-gasto' : 'badge-ingreso'}">${t.type === 'gasto' ? 'Gasto' : 'Ingreso'}</span></td>
            <td style="color: #555;">${t.description || '-'}</td>
            <td style="font-weight: bold; text-align: right;">$${t.amount.toLocaleString()}</td>
          </tr>
        `;
      });
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte FLOWI - ${title}</title>
          <style>
            @media print {
              .no-print { display: none !important; }
              body { padding: 0 !important; }
            }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 40px 40px 100px 40px; line-height: 1.5; background: #fff; }
            .action-bar { display: flex; gap: 12px; background: #0F172A; padding: 15px 25px; border-radius: 16px; margin-bottom: 30px; align-items: center; justify-content: space-between; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
            .action-bar span { color: #fff; font-size: 13px; font-weight: 600; }
            .btn { padding: 8px 16px; font-size: 12px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: opacity 0.2s; text-transform: uppercase; }
            .btn-primary { background: #10B981; color: #fff; }
            .btn-secondary { background: #3B82F6; color: #fff; }
            .btn:hover { opacity: 0.9; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 25px; }
            .brand { font-size: 32px; font-weight: 800; color: #10b981; letter-spacing: -0.5px; }
            .brand span { color: #3b82f6; }
            .report-meta { text-align: right; font-size: 12px; color: #555; }
            .report-title { font-size: 22px; font-weight: 700; margin: 0 0 5px 0; color: #111; }
            .summary-card { display: flex; gap: 20px; background: #f4f6f8; padding: 15px 20px; border-radius: 12px; margin-bottom: 30px; justify-content: space-between; font-size: 14px; border: 1px solid #e5e7eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { padding: 12px 10px; text-align: left; background-color: #f9fafb; color: #374151; font-weight: 700; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
            .badge { display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 700; border-radius: 6px; text-transform: uppercase; }
            .badge-gasto { background: #fef2f2; color: #ef4444; }
            .badge-ingreso { background: #ecfdf5; color: #10b981; }
            .badge-paid { background: #ecfdf5; color: #10b981; }
            .badge-pending { background: #fffbeb; color: #d97706; }
            .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="action-bar no-print">
            <span>¿Qué deseas hacer con tu reporte de ${title}?</span>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" onclick="window.print()">Guardar como PDF / Imprimir</button>
              <button class="btn btn-primary" onclick="window.close()">Cerrar Pestaña</button>
            </div>
          </div>

          <div class="header-container">
            <div>
              <div class="brand">flowi<span>.</span></div>
              <div style="font-size: 11px; color: #6B7280; font-weight: 500;">Tu dinero, en flujo.</div>
            </div>
            <div class="report-meta">
              <div class="report-title">Reporte de ${title}</div>
              <div><strong>Periodo:</strong> ${getPeriodString()}</div>
              <div><strong>Generado:</strong> ${dateStr}</div>
            </div>
          </div>
          
          ${summaryHTML}
          
          <table>
            <thead>
              ${debts.length > 0 
                ? '<tr><th>Concepto</th><th>Monto Original</th><th>Abonado</th><th>Pendiente</th><th>Estado</th></tr>'
                : '<tr><th>Fecha y Hora</th><th>Categoría</th><th>Tipo</th><th>Descripción</th><th style="text-align: right;">Monto</th></tr>'
              }
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          
          <div class="footer">
            Este reporte fue generado de manera segura desde tu aplicación de finanzas FLOWI.
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
  };

  // Obtener el contenido del CSV para compartir como archivo real
  const getCSVString = () => {
    let csv = "";
    const dateStr = new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    csv += "FLOWI — Tu dinero en flujo\n";
    csv += `Reporte de:;${title}\n`;
    csv += `Periodo del reporte:;${getPeriodString()}\n`;
    csv += `Fecha y hora de consulta:;${dateStr}\n\n`;

    csv += "RESUMEN EJECUTIVO\n";
    if (debts.length > 0) {
      const pending = debts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
      const paid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
      const total = debts.reduce((sum, d) => sum + d.totalAmount, 0);
      csv += `Total Deuda original:;"${Math.round(total)}"\n`;
      csv += `Total Abonado:;"${Math.round(paid)}"\n`;
      csv += `Total Pendiente de pago:;"${Math.round(pending)}"\n\n`;
    } else {
      const totalGastos = transactions.filter(t => t.type === 'gasto').reduce((sum, t) => sum + t.amount, 0);
      const totalIngresos = transactions.filter(t => t.type === 'ingreso').reduce((sum, t) => sum + t.amount, 0);
      const balanceReal = totalIngresos - totalGastos;
      csv += `Total Ingresos:;"${Math.round(totalIngresos)}"\n`;
      csv += `Total Gastos:;"${Math.round(totalGastos)}"\n`;
      csv += `Dinero Disponible (Balance):;"${Math.round(balanceReal)}"\n\n`;
    }

    csv += "DETALLE DEL REPORTE\n";
    if (debts.length > 0) {
      csv += "Concepto;Monto Total;Abonado;Deuda Pendiente;Estado\n";
      debts.forEach(d => {
        const pending = d.totalAmount - d.paidAmount;
        csv += `"${d.title}";"${Math.round(d.totalAmount)}";"${Math.round(d.paidAmount)}";"${Math.round(pending)}";"${d.status === 'paid' ? 'Liquidada' : 'Pendiente'}"\n`;
      });
    } else {
      csv += "Fecha y Hora;Categoría;Tipo;Descripción;Monto\n";
      transactions.forEach(t => {
        csv += `"${formatTimestamp(t.date)}";"${t.category}";"${t.type === 'gasto' ? 'Gasto' : 'Ingreso'}";"${t.description || ''}";"${Math.round(t.amount)}"\n`;
      });
    }
    return csv;
  };

  // Compartir reporte mediante Web Share API
  const handleShare = async () => {
    if (!navigator.share) {
      alert('Tu navegador o dispositivo no soporta la función de compartir directamente.');
      return;
    }

    try {
      let fileToShare: File | null = null;
      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'excel') {
        const csvText = getCSVString();
        const blob = new Blob(["\uFEFF" + csvText], { type: 'text/csv;charset=utf-8;' });
        fileToShare = new File([blob], `Reporte_FLOWI_${title.replace(/\s+/g, '_')}_${dateStr}.csv`, { type: 'text/csv' });
      } else {
        const previewElement = document.getElementById('report-preview-card');
        if (previewElement) {
          const html2canvas = (await import('html2canvas')).default;
          
          // Crear un clon fuera de pantalla para capturar todo el reporte sin scrollbar ni recortes
          const clone = previewElement.cloneNode(true) as HTMLElement;
          clone.style.position = 'fixed';
          clone.style.top = '-9999px';
          clone.style.left = '-9999px';
          clone.style.maxHeight = 'none'; // Quitar límite de altura
          clone.style.height = 'auto';
          clone.style.width = '380px';    // Ancho fijo óptimo de tarjeta
          document.body.appendChild(clone);

          const canvas = await html2canvas(clone, {
            backgroundColor: '#0A0A0F',
            scale: 2,
            logging: false,
            useCORS: true
          });
          
          document.body.removeChild(clone); // Limpiar el DOM

          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            fileToShare = new File([blob], `Reporte_FLOWI_${title.replace(/\s+/g, '_')}_${dateStr}.png`, { type: 'image/png' });
          }
        }
      }

      if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
        await navigator.share({
          files: [fileToShare],
          title: `Reporte de ${title} - FLOWI`,
          text: `Te comparto mi reporte financiero de ${title} generado desde FLOWI.`
        });
      } else {
        await navigator.share({
          title: `Reporte de ${title} - FLOWI`,
          text: `Te comparto mi reporte financiero de ${title} generado desde FLOWI.`,
          url: window.location.origin
        });
      }
    } catch (err) {
      console.error('Error al compartir:', err);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className={`w-full max-w-md relative animate-fade-in-up overflow-hidden ${isTechTheme ? 'bg-black border border-accent rounded-none shadow-[0_0_50px_rgba(0,229,160,0.15)]' : 'bg-[#0A0A0F] border border-white/10 rounded-3xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className={`p-5 border-b border-glass-border flex justify-between items-center ${isTechTheme ? 'bg-black' : 'bg-gradient-to-r from-[var(--accent-glow)] to-transparent'}`}>
          <div>
            <h3 className={`text-lg font-bold ${isTechTheme ? 'font-mono text-accent uppercase tracking-widest' : 'text-text-primary font-syne'}`}>
              {format ? 'Vista Previa del Reporte' : 'Exportar Reporte'}
            </h3>
            <p className={`text-xs mt-0.5 ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-secondary'}`}>
              {format ? 'Revisa la estructura antes de exportar' : 'Elige el formato de tu preferencia'}
            </p>
          </div>
          <button onClick={onClose} className={`transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-white/50 hover:text-white'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6">
          {!format ? (
            // Pantalla 1: Selección de Formato
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => handleSelectFormat('pdf')}
                className={`flex items-center gap-4 p-4 text-left border transition-all ${isTechTheme ? 'border-accent/20 bg-accent/5 hover:bg-accent/10 rounded-none' : 'border-white/5 bg-white/5 hover:bg-white/10 rounded-2xl'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isTechTheme ? 'font-mono text-accent' : 'text-white'}`}>Documento PDF (.pdf)</h4>
                  <p className="text-xs text-text-muted mt-0.5">Reporte formal limpio con tablas ordenadas listo para imprimir.</p>
                </div>
              </button>

              <button 
                onClick={() => handleSelectFormat('excel')}
                className={`flex items-center gap-4 p-4 text-left border transition-all ${isTechTheme ? 'border-accent/20 bg-accent/5 hover:bg-accent/10 rounded-none' : 'border-white/5 bg-white/5 hover:bg-white/10 rounded-2xl'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isTechTheme ? 'font-mono text-accent' : 'text-white'}`}>Hoja de Cálculo (.csv)</h4>
                  <p className="text-xs text-text-muted mt-0.5">Ideal para importar y analizar en Excel o Google Sheets.</p>
                </div>
              </button>

              <button 
                onClick={() => handleSelectFormat('image')}
                className={`flex items-center gap-4 p-4 text-left border transition-all ${isTechTheme ? 'border-accent/20 bg-accent/5 hover:bg-accent/10 rounded-none' : 'border-white/5 bg-white/5 hover:bg-white/10 rounded-2xl'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isTechTheme ? 'font-mono text-accent' : 'text-white'}`}>Captura de Imagen (.png)</h4>
                  <p className="text-xs text-text-muted mt-0.5">Ficha ejecutiva visual ideal para compartir por redes sociales.</p>
                </div>
              </button>
            </div>
          ) : generating ? (
            // Estado de Carga
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className={`text-sm ${isTechTheme ? 'font-mono text-accent' : 'text-text-secondary'}`}>Generando reporte...</p>
            </div>
          ) : (
            // Pantalla 2: Previsualización del Reporte
            <div className="space-y-5 animate-fade-in-up">
              {/* Contenedor de Previsualización */}
              <div id="report-preview-card" className="p-5 bg-[#0A0A0F] border border-white/10 rounded-2xl max-h-[320px] overflow-y-auto scrollbar-hide text-white/90 space-y-5">
                {/* Brand Header */}
                <div className="flex justify-between items-start border-b border-white/10 pb-3">
                  <div>
                    <span className="text-sm font-bold text-accent tracking-wider font-mono">FLOWI</span>
                    <p className="text-[9px] text-text-muted">Tu dinero, en flujo.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white font-bold">{title}</span>
                    <p className="text-[8px] text-text-muted">{new Date().toLocaleDateString('es-CO')} {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                {/* Resumen Ejecutivo */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Resumen Ejecutivo</span>
                  {debts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-center pt-1">
                      <div>
                        <div className="text-[8px] text-text-muted">Total</div>
                        <div className="font-bold">${debts.reduce((sum, d) => sum + d.totalAmount, 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[8px] text-text-muted">Abonado</div>
                        <div className="font-bold text-accent">${debts.reduce((sum, d) => sum + d.paidAmount, 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[8px] text-text-muted">Pendiente</div>
                        <div className="font-bold text-orange-400">${debts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-center pt-1">
                      <div>
                        <div className="text-[8px] text-text-muted">Ingresos</div>
                        <div className="font-bold text-accent">${transactions.filter(t => t.type === 'ingreso').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[8px] text-text-muted">Gastos</div>
                        <div className="font-bold text-red-400">${transactions.filter(t => t.type === 'gasto').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[8px] text-text-muted">Disponible</div>
                        <div className="font-bold text-accent">${(transactions.filter(t => t.type === 'ingreso').reduce((sum, t) => sum + t.amount, 0) - transactions.filter(t => t.type === 'gasto').reduce((sum, t) => sum + t.amount, 0)).toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detalle */}
                <div className="space-y-2">
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Detalle del Reporte</span>
                  <div className="space-y-2.5 divide-y divide-white/5 pt-1">
                    {debts.length > 0 ? (
                      debts.map((d, index) => (
                        <div key={index} className="flex justify-between items-center text-[10px] pt-2">
                          <div>
                            <span className="font-bold text-white block">{d.title}</span>
                            <span className="text-[8px] text-text-muted">Monto: ${d.totalAmount.toLocaleString()}</span>
                          </div>
                          <span className="text-orange-400 font-bold">${(d.totalAmount - d.paidAmount).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      transactions.map((t, index) => (
                        <div key={index} className="flex justify-between items-center text-[10px] pt-2">
                          <div>
                            <span className="font-bold text-white block">{t.category}</span>
                            <span className="text-[8px] text-text-muted">{formatTimestamp(t.date)}</span>
                          </div>
                          <span className={t.type === 'gasto' ? 'text-red-400 font-bold' : 'text-accent font-bold'}>${t.amount.toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => setFormat(null)}
                  className={`flex-1 py-3 text-xs font-bold transition-all border ${isTechTheme ? 'border-accent/30 hover:border-accent text-accent rounded-none' : 'border-white/10 hover:bg-white/5 text-text-secondary rounded-xl'}`}
                >
                  Volver
                </button>
                <button
                  onClick={handleShare}
                  className={`py-3 px-4 text-xs font-bold transition-all border flex items-center justify-center gap-2 ${isTechTheme ? 'border-accent/30 hover:border-accent text-accent rounded-none' : 'border-white/10 hover:bg-white/5 text-text-secondary rounded-xl'}`}
                  title="Compartir Reporte"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={format === 'excel' ? exportToCSV : exportToPDF}
                  className={`flex-[2] py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 ${isTechTheme ? 'bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-black rounded-none font-mono uppercase' : 'bg-gradient-to-r from-accent to-accent-dim text-black rounded-xl hover:opacity-90'}`}
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
