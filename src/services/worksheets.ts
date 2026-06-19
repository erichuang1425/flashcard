import { auth, db } from './firebase';
import {
  collection, addDoc, getDocs, query, updateDoc, deleteDoc, doc, getDoc,
} from 'firebase/firestore';
import { Worksheet, WorksheetStats } from '../types';

export const addWorksheet = async (worksheetData: Omit<Worksheet, 'id'>) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const worksheet = {
      ...worksheetData,
      createdAt: new Date(),
      userId: auth.currentUser.uid,
      content: worksheetData.content || null,
      questions: worksheetData.questions || []
    };

    const worksheetRef = await addDoc(
      collection(db, 'users', auth.currentUser.uid, 'worksheets'),
      worksheet
    );

    return worksheetRef.id;
  } catch (error) {
    console.error('Error adding worksheet:', error);
    throw error;
  }
};

export const getUserWorksheets = async (userId: string) => {

  const q = query(collection(db, 'users', userId, 'worksheets'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Worksheet[];
};

export const deleteWorksheet = async (userId: string, worksheetId: string) => {
  try {
    const worksheetRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    await deleteDoc(worksheetRef);
  } catch (error) {
    console.error('Error deleting worksheet:', error);
    throw error;
  }
};

const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const getWorksheet = async (userId: string, worksheetId: string): Promise<Worksheet | null> => {
  try {
    const docRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();

    return {
      id: docSnap.id,
      title: data.title || '',
      description: data.description || '',
      questions: shuffleArray(data.questions || []), // Shuffle questions
      content: data.content || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      userId: data.userId,
      type: data.type || 'general',
      difficulty: data.difficulty || 'medium',
      timeLimit: data.timeLimit || 0,
      templateId: data.templateId || '',
      words: data.words || [],
      categories: data.categories || [],
      stats: data.stats || {
        attempts: 0,
        avgScore: 0,
        lastAttempt: null
      }
    } as Worksheet;
  } catch (error) {
    console.error('Error getting worksheet:', error);
    throw error;
  }
};

export const updateWorksheetContent = async (
  userId: string,
  worksheetId: string,
  content: { questions?: any[], content?: string }
) => {
  try {
    const worksheetRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    await updateDoc(worksheetRef, {
      ...content,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating worksheet content:', error);
    throw error;
  }
};

export const updateWorksheetProgress = async (
  userId: string,
  worksheetId: string,
  stats: WorksheetStats
) => {
  try {
    const worksheetRef = doc(db, 'users', userId, 'worksheets', worksheetId);
    await updateDoc(worksheetRef, { stats });
  } catch (error) {
    console.error('Error updating worksheet progress:', error);
    throw error;
  }
};
