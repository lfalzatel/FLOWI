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

  // Función para exportar a CSV/Excel
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM para Excel UTF-8
    
    if (debts.length > 0) {
      csvContent += "Reporte de Deudas - FLOWI\n\n";
      csvContent += "Título,Monto Total,Pagado,Pendiente,Estado\n";
      debts.forEach(d => {
        const pending = d.totalAmount - d.paidAmount;
        csvContent += `"${d.title}",${d.totalAmount},${d.paidAmount},${pending},"${d.status === 'paid' ? 'Liquidada' : 'Pendiente'}"\n`;
      });
    } else {
      csvContent += `Reporte de Transacciones (${title}) - FLOWI\n\n`;
      csvContent += "Fecha,Categoría,Tipo,Descripción,Monto\n";
      transactions.forEach(t => {
        const d = t.date instanceof Date ? t.date : new Date(t.date as any);
        const formattedDate = d.toLocaleDateString('es-CO');
        csvContent += `"${formattedDate}","${t.category}","${t.type === 'gasto' ? 'Gasto' : 'Ingreso'}","${t.description || ''}",${t.amount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_FLOWI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para exportar a PDF (mediante impresión nativa estilizada)
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isGasto = title.toLowerCase().includes('gasto');
    const isIngreso = title.toLowerCase().includes('ingreso');

    let rowsHTML = '';
    let total = 0;

    if (debts.length > 0) {
      debts.forEach(d => {
        const pending = d.totalAmount - d.paidAmount;
        total += pending;
        rowsHTML += `
          <tr>
            <td>${d.title}</td>
            <td>$${d.totalAmount.toLocaleString()}</td>
            <td>$${d.paidAmount.toLocaleString()}</td>
            <td style="color: #e28743; font-weight: bold;">$${pending.toLocaleString()}</td>
            <td>${d.status === 'paid' ? 'Liquidada' : 'Pendiente'}</td>
          </tr>
        `;
      });
    } else {
      transactions.forEach(t => {
        total += t.amount;
        const d = t.date instanceof Date ? t.date : new Date(t.date as any);
        rowsHTML += `
          <tr>
            <td>${d.toLocaleDateString('es-CO')}</td>
            <td>${t.category}</td>
            <td style="color: ${t.type === 'gasto' ? '#ff5b5b' : '#00e5a0'}">${t.type === 'gasto' ? 'Gasto' : 'Ingreso'}</td>
            <td>${t.description || '-'}</td>
            <td style="font-weight: bold;">$${t.amount.toLocaleString()}</td>
          </tr>
        `;
      });
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte FLOWI - ${title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; }
            .header { display: flex; justify-between: space-between; align-items: center; border-bottom: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #00e5a0; }
            .title { font-size: 18px; color: #666; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eaeaea; }
            th { background-color: #f9f9f9; color: #555; font-weight: bold; }
            .total-box { margin-top: 30px; text-align: right; font-size: 20px; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eaeaea; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">flowi</div>
            <div class="title">Reporte de ${title}<br><small>${new Date().toLocaleDateString('es-CO')}</small></div>
          </div>
          <table>
            <thead>
              ${debts.length > 0 
                ? '<tr><th>Concepto</th><th>Monto Total</th><th>Abonado</th><th>Pendiente</th><th>Estado</th></tr>'
                : '<tr><th>Fecha</th><th>Categoría</th><th>Tipo</th><th>Descripción</th><th>Monto</th></tr>'
              }
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <div class="total-box">
            ${debts.length > 0 ? 'Total Deuda Pendiente' : isGasto ? 'Total Gastado' : isIngreso ? 'Total Ingresado' : 'Total General'}: 
            <span style="color: #00e5a0;">$${total.toLocaleString()}</span>
          </div>
          <div class="footer">
            Reporte generado automáticamente por FLOWI — Tu dinero, en flujo.
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    // Esperar un momento a que renderice y llamar a la impresión/descarga a PDF del navegador
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Obtener el contenido crudo del CSV
  const getCSVString = () => {
    let csv = "";
    if (debts.length > 0) {
      csv += "Reporte de Deudas - FLOWI\n\n";
      csv += "Título,Monto Total,Pagado,Pendiente,Estado\n";
      debts.forEach(d => {
        const pending = d.totalAmount - d.paidAmount;
        csv += `"${d.title}",${d.totalAmount},${d.paidAmount},${pending},"${d.status === 'paid' ? 'Liquidada' : 'Pendiente'}"\n`;
      });
    } else {
      csv += `Reporte de Transacciones (${title}) - FLOWI\n\n`;
      csv += "Fecha,Categoría,Tipo,Descripción,Monto\n";
      transactions.forEach(t => {
        const d = t.date instanceof Date ? t.date : new Date(t.date as any);
        const formattedDate = d.toLocaleDateString('es-CO');
        csv += `"${formattedDate}","${t.category}","${t.type === 'gasto' ? 'Gasto' : 'Ingreso'}","${t.description || ''}",${t.amount}\n`;
      });
    }
    return csv;
  };

  // Compartir reporte mediante Web Share API (enviando el archivo real)
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
        // Agregar BOM para UTF-8 correcto en Excel
        const blob = new Blob(["\uFEFF" + csvText], { type: 'text/csv;charset=utf-8;' });
        fileToShare = new File([blob], `Reporte_FLOWI_${dateStr}.csv`, { type: 'text/csv' });
      } else {
        // Para PDF e Imagen en móviles, generamos una tarjeta de captura de la previsualización
        const previewElement = document.getElementById('report-preview-card');
        if (previewElement) {
          // Utilizaremos un canvas simple o captura para compartir como imagen
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(previewElement, {
            backgroundColor: '#0A0A0F',
            scale: 2,
            logging: false
          });
          
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            fileToShare = new File([blob], `Reporte_FLOWI_${dateStr}.png`, { type: 'image/png' });
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
        // Fallback si no se puede compartir el archivo directo
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
              <div id="report-preview-card" className={`p-4 border max-h-64 overflow-y-auto ${isTechTheme ? 'border-accent/30 bg-black' : 'border-white/5 bg-white/5 rounded-2xl'} scrollbar-hide`}>
                <div className="space-y-4 text-xs font-mono text-white/70">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-accent font-bold">FLOWI REPORT</span>
                    <span>{new Date().toLocaleDateString('es-CO')}</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Reporte de: {title}</p>
                    <p className="text-[10px] text-text-muted">Filtro: {filterType} ({filterValue})</p>
                  </div>
                  
                  {/* Filas de ejemplo de la tabla */}
                  <div className="space-y-2.5 pt-2">
                    {debts.length > 0 ? (
                      debts.slice(0, 3).map((d, index) => (
                        <div key={index} className="flex justify-between text-[11px]">
                          <span>• {d.title}</span>
                          <span className="text-orange-400">${(d.totalAmount - d.paidAmount).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      transactions.slice(0, 3).map((t, index) => (
                        <div key={index} className="flex justify-between text-[11px]">
                          <span>• {t.category} ({t.description || 'Sin desc.'})</span>
                          <span className={t.type === 'gasto' ? 'text-red-400' : 'text-accent'}>${t.amount.toLocaleString()}</span>
                        </div>
                      ))
                    )}
                    {(transactions.length > 3 || debts.length > 3) && (
                      <p className="text-center text-[10px] text-text-muted italic pt-1">... y {Math.max(transactions.length, debts.length) - 3} filas más ...</p>
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
