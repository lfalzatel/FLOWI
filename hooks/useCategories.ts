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

export function useCategories() {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCustomCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const categoriesRef = collection(db, 'customCategories');
    const q = query(categoriesRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as CustomCategory[];
      setCustomCategories(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching custom categories in real-time:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Combine base categories with custom ones for dropdowns
  const allCategories: CategoryOption[] = [
    ...BASE_CATEGORIES,
    ...customCategories.map(cat => ({
      label: cat.label,
      icon: cat.icon,
      color: cat.color,
      isCustom: true,
      id: cat.id
    }))
  ];

  return {
    customCategories,
    allCategories,
    loading,
    refreshCategories: () => {} // Kept for backwards compatibility if any component calls it
  };
}
