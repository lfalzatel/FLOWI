import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { CustomCategory, BASE_CATEGORIES } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export interface CategoryOption {
  label: string;
  icon: string;
  color: string;
  isCustom?: boolean;
  id?: string;
}

// Variables en memoria a nivel de módulo para almacenar el estado y los listeners compartidos
let sharedCustomCategories: CustomCategory[] = [];
let sharedListeners: Array<(cats: CustomCategory[]) => void> = [];
let unsubscribeShared: (() => void) | null = null;
let currentUserId: string | null = null;

export function useCategories() {
  const { user, profile } = useAuth();
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(sharedCustomCategories);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCustomCategories([]);
      sharedCustomCategories = [];
      setLoading(false);
      return;
    }

    // Si el usuario cambia, limpiamos la suscripción previa
    if (currentUserId !== user.uid) {
      if (unsubscribeShared) {
        unsubscribeShared();
        unsubscribeShared = null;
      }
      currentUserId = user.uid;
      sharedCustomCategories = [];
    }

    // Registrar este componente como un listener del estado
    const listener = (cats: CustomCategory[]) => {
      setCustomCategories(cats);
      setLoading(false);
    };
    sharedListeners.push(listener);

    // Si no hay una suscripción activa a Firestore, la creamos
    if (!unsubscribeShared) {
      setLoading(true);
      const categoriesRef = collection(db, 'customCategories');
      const q = query(categoriesRef, where('userId', '==', user.uid));

      unsubscribeShared = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as CustomCategory[];
        
        sharedCustomCategories = data;
        // Notificar a todos los hooks activos del cambio de datos
        sharedListeners.forEach(l => l(data));
      }, (error) => {
        console.error('Error fetching custom categories in real-time:', error);
        sharedListeners.forEach(l => l([]));
      });
    } else {
      // Si ya hay una suscripción activa, cargamos los datos que tenemos inmediatamente
      setCustomCategories(sharedCustomCategories);
      setLoading(false);
    }

    return () => {
      // Remover este listener al desmontar el componente
      sharedListeners = sharedListeners.filter(l => l !== listener);
      // Si ya no quedan componentes escuchando, limpiamos la conexión con Firebase
      if (sharedListeners.length === 0 && unsubscribeShared) {
        unsubscribeShared();
        unsubscribeShared = null;
        currentUserId = null;
      }
    };
  }, [user]);

  // Combine base categories with custom ones for dropdowns
  const visibleBaseCategories = BASE_CATEGORIES.filter(
    cat => !profile?.hiddenCategories?.includes(cat.label)
  );

  const allCategories: CategoryOption[] = [
    ...visibleBaseCategories,
    ...customCategories.map(cat => ({
      label: cat.label,
      icon: cat.icon,
      color: cat.color,
      isCustom: true,
      id: cat.id
    }))
  ].sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));

  return {
    customCategories,
    allCategories,
    loading,
    refreshCategories: () => {} // Kept for backwards compatibility
  };
}
