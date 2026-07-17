import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Note, addNote, updateNote, deleteNote } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const ref = collection(db, 'fl_notes');
    // Avoid orderBy('updatedAt', 'desc') in the Firestore query to prevent composite index requirements
    const q = query(ref, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate(),
            updatedAt: docData.updatedAt?.toDate()
          } as Note;
        });
        
        // Sort in memory: most recently updated first
        data.sort((a, b) => {
          const timeA = (a.updatedAt as Date)?.getTime?.() || 0;
          const timeB = (b.updatedAt as Date)?.getTime?.() || 0;
          return timeB - timeA;
        });
        
        setNotes(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching notes:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return {
    notes,
    loading,
    error,
    addNote,
    updateNote,
    deleteNote
  };
}
