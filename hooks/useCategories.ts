import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { CustomCategory, getCustomCategories, BASE_CATEGORIES } from '@/lib/firestore';

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

  const fetchCategories = useCallback(async () => {
    if (!user) {
      setCustomCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getCustomCategories(user.uid);
      setCustomCategories(data);
    } catch (error) {
      console.error('Error fetching custom categories:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
    refreshCategories: fetchCategories
  };
}
