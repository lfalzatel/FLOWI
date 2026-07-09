'use client';

import { useState, useEffect } from 'react';
import { X, Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useTheme } from '@/components/ThemeProvider';
import { formatCurrency } from '@/lib/format';

interface Props {
  onClose: () => void;
}

export function ManageBudgetModal({ onClose }: Props) {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [budget, setBudget] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.budget) {
      setBudget(profile.budget.toString());
    }
  }, [profile]);

  // Bloquear scroll
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = 'hidden';
    html.style.height = '100%';
    body.style.overflow = 'hidden';
    body.style.height = '100%';
    return () => {
      html.style.overflow = '';
      html.style.height = '';
      body.style.overflow = '';
      body.style.height = '';
    };
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const budgetValue = parseFloat(budget);
      await updateDoc(doc(db, 'users', user.uid), {
        budget: isNaN(budgetValue) ? 0 : budgetValue
      });
      onClose();
    } catch (err) {
      console.error('Error saving budget:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div 
        className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[95vh] overflow-y-auto glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50 bg-deep' : 'rounded-3xl'} flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 sm:p-6 border-b ${isTechTheme ? 'border-accent/20 bg-accent/5' : 'border-glass-border'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center ${isTechTheme ? 'bg-accent/10 rounded-none' : 'bg-accent/20 rounded-xl'}`}>
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className={`font-bold ${isTechTheme ? 'font-mono text-accent uppercase tracking-widest' : 'font-syne text-xl text-text-primary'}`}>Presupuesto</h2>
              <p className={`text-xs mt-0.5 ${isTechTheme ? 'font-mono text-accent/60 uppercase tracking-wider' : 'text-text-secondary'}`}>Límite mensual</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isTechTheme ? 'hover:bg-accent/10 text-accent/70' : 'hover:bg-white/10 text-text-muted hover:text-text-primary'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          <label className={`block text-xs font-medium mb-2 ${isTechTheme ? 'font-mono text-accent/80 uppercase tracking-widest' : 'text-text-secondary'}`}>
            Monto de tu presupuesto mensual
          </label>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${isTechTheme ? 'text-accent font-mono' : 'text-text-muted'}`}>$</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Ej. 1500000"
              className={`w-full pl-8 pr-4 py-3 rounded-xl transition-all focus:outline-none ${isTechTheme ? 'bg-black/40 border border-accent/20 focus:border-accent text-accent font-mono text-lg' : 'bg-white/5 border border-white/10 focus:border-accent focus:bg-white/10 text-text-primary font-syne text-lg'}`}
            />
          </div>
          <p className={`mt-2 text-xs ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-muted'}`}>
            Se usará para proyectar si cerrarás el mes gastando más de la cuenta.
          </p>
          {budget && !isNaN(parseFloat(budget)) && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${isTechTheme ? 'bg-accent/10 border border-accent/20 text-accent font-mono' : 'bg-emerald-500/10 text-emerald-500'}`}>
              Presupuesto configurado a: <strong>{formatCurrency(parseFloat(budget), profile?.currency)}</strong>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-5 sm:p-6 border-t mt-auto ${isTechTheme ? 'border-accent/20 bg-black/40' : 'border-glass-border'}`}>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center transition-all ${saving ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'} ${isTechTheme ? 'bg-accent/20 border border-accent text-accent font-mono uppercase tracking-widest hover:bg-accent/30' : 'bg-gradient-to-r from-accent to-accent-dim text-black shadow-lg shadow-accent/25 hover:opacity-90 font-syne'}`}
          >
            {saving ? (
              <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isTechTheme ? 'border-accent' : 'border-black'}`} />
            ) : (
              'Guardar Presupuesto'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
