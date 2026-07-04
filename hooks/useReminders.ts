'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Reminder } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

export function useReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = collection(db, 'fl_reminders');
    const q = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const docData = d.data();
        return {
          id: d.id,
          ...docData,
          createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate() : docData.createdAt,
          lastTriggered: docData.lastTriggered instanceof Timestamp ? docData.lastTriggered.toDate() : docData.lastTriggered,
        };
      }) as Reminder[];
      
      setReminders(data);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to reminders:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { reminders, loading, refresh: () => {} };
}
