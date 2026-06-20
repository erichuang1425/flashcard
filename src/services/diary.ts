import { db } from './firebase';
import {
  collection, addDoc, getDocs, query, orderBy, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import { DiaryEntry } from '../types';

export const addDiaryEntry = async (entry: Omit<DiaryEntry, 'id'>) => {
  try {
    const ref = await addDoc(collection(db, 'users', entry.userId, 'diary'), {
      ...entry,
      createdAt: entry.createdAt || new Date(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error adding diary entry:', error);
    throw error;
  }
};

export const getDiaryEntries = async (userId: string): Promise<DiaryEntry[]> => {
  try {
    const q = query(
      collection(db, 'users', userId, 'diary'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as DiaryEntry[];
  } catch (error) {
    console.error('Error fetching diary entries:', error);
    throw error;
  }
};

export const updateDiaryEntry = async (
  userId: string,
  entryId: string,
  text: string
) => {
  try {
    const ref = doc(db, 'users', userId, 'diary', entryId);
    await updateDoc(ref, { text });
  } catch (error) {
    console.error('Error updating diary entry:', error);
    throw error;
  }
};

export const deleteDiaryEntry = async (userId: string, entryId: string) => {
  try {
    const ref = doc(db, 'users', userId, 'diary', entryId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting diary entry:', error);
    throw error;
  }
};
