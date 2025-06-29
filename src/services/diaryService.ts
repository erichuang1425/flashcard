import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from './firebase';
import type { DiaryEntry } from '../types';

export const addDiaryEntry = async (userId: string, content: string): Promise<string> => {
  const docRef = await addDoc(collection(db, 'users', userId, 'diary'), {
    content,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getDiaryEntries = async (userId: string): Promise<DiaryEntry[]> => {
  const q = query(collection(db, 'users', userId, 'diary'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    userId,
    content: doc.data().content,
    createdAt: doc.data().createdAt?.toDate?.() || new Date()
  }));
};

export const updateDiaryEntry = async (
  userId: string,
  entryId: string,
  content: string
): Promise<void> => {
  const entryRef = doc(db, 'users', userId, 'diary', entryId);
  await updateDoc(entryRef, { content });
};

export const deleteDiaryEntry = async (userId: string, entryId: string): Promise<void> => {
  const entryRef = doc(db, 'users', userId, 'diary', entryId);
  await deleteDoc(entryRef);
};
