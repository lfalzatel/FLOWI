'use client';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddExpenseModal({ onClose, onSuccess }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="glass-card p-6 rounded-3xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="font-syne font-bold text-xl text-white mb-4">Nueva Transacción</h2>
        <p className="text-white/60 mb-4">Este es un componente temporal (Placeholder). Aquí iría el formulario para agregar gastos o ingresos.</p>
        <button
          onClick={() => { onSuccess?.(); onClose(); }}
          className="w-full py-2.5 rounded-xl bg-accent text-black font-semibold hover:opacity-90 transition-all"
        >
          Simular Guardado
        </button>
      </div>
    </div>
  );
}
