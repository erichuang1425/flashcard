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

export const addDiaryEntry = async (
  userId: string,
  title: string,
  content: string,
  tags: string[]
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'users', userId, 'diary'), {
    title,
    content,
    tags,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const getDiaryEntries = async (userId: string): Promise<DiaryEntry[]> => {
  const q = query(
    collection(db, 'users', userId, 'diary'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    userId,
    title: doc.data().title || '',
    content: doc.data().content,
    tags: doc.data().tags || [],
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate?.()
  }));
};

export const updateDiaryEntry = async (
  userId: string,
  entryId: string,
  title: string,
  content: string,
  tags: string[]
): Promise<void> => {
  const entryRef = doc(db, 'users', userId, 'diary', entryId);
  await updateDoc(entryRef, {
    title,
    content,
    tags,
    updatedAt: serverTimestamp()
  });
};

export const deleteDiaryEntry = async (userId: string, entryId: string): Promise<void> => {
  const entryRef = doc(db, 'users', userId, 'diary', entryId);
  await deleteDoc(entryRef);
};
