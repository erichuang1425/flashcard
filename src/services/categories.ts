import { db } from './firebase';
import {
  collection, getDocs, query, where, deleteDoc, doc, writeBatch,
  runTransaction, increment, setDoc,
} from 'firebase/firestore';
import { VocabularyWord } from '../types';
import { deleteFlashcards } from './cards';

export const categoryDocumentId = (name: string): string => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) throw new Error('Category name is required');
  return encodeURIComponent(normalized);
};

export interface Category {
  id?: string;
  name: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export const addCategory = async (name: string, userId: string): Promise<string> => {
  const trimmedName = name.trim();
  const categoryId = categoryDocumentId(trimmedName);
  const categoryRef = doc(db, 'users', userId, 'categories', categoryId);

  try {
    await runTransaction(db, async transaction => {
      const existing = await transaction.get(categoryRef);
      if (existing.exists()) return;

      const now = new Date();
      transaction.set(categoryRef, {
        name: trimmedName,
        count: 0,
        createdAt: now,
        updatedAt: now,
      });
    });
    return categoryId;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const getCategories = async (userId: string): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, 'users', userId, 'categories');
    const [currentSnapshot, legacySnapshot] = await Promise.all([
      getDocs(categoriesRef),
      getDocs(query(collection(db, 'categories'), where('userId', '==', userId))),
    ]);

    const categories = new Map<string, Category>();
    currentSnapshot.docs.forEach(categoryDoc => {
      categories.set(categoryDoc.id, {
        id: categoryDoc.id,
        name: categoryDoc.data().name,
        count: categoryDoc.data().count ?? 0,
        createdAt: categoryDoc.data().createdAt?.toDate(),
        updatedAt: categoryDoc.data().updatedAt?.toDate(),
      });
    });

    // Migrate legacy global categories lazily. Existing user-scoped documents
    // win so repeated reads cannot inflate counts or overwrite newer metadata.
    const migrationBatch = writeBatch(db);
    let hasMigrations = false;
    legacySnapshot.docs.forEach(legacyDoc => {
      const data = legacyDoc.data();
      if (!data.name) return;
      const id = categoryDocumentId(data.name);
      if (categories.has(id)) return;

      const category: Category = {
        id,
        name: data.name.trim(),
        count: data.count ?? 0,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };
      categories.set(id, category);
      migrationBatch.set(doc(categoriesRef, id), {
        name: category.name,
        count: category.count,
        createdAt: category.createdAt ?? new Date(),
        updatedAt: category.updatedAt ?? new Date(),
      });
      hasMigrations = true;
    });

    if (hasMigrations) await migrationBatch.commit();
    return [...categories.values()];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const incrementCategoryCount = async (userId: string, categoryName: string) => {
  const categoryRef = doc(
    db,
    'users',
    userId,
    'categories',
    categoryDocumentId(categoryName)
  );
  await setDoc(
    categoryRef,
    {
      name: categoryName.trim(),
      count: increment(1),
      updatedAt: new Date(),
    },
    { merge: true }
  );
};

/**
 * Whether a card belongs to a category, matched by canonical ID. Cards keep
 * whatever casing they were written with while category documents are keyed
 * by the lowercased ID, so exact string comparison against the display name
 * would miss variant casings.
 */
export const isWordInCategory = (
  word: Pick<VocabularyWord, 'categories'>,
  categoryName: string
): boolean => {
  const categoryId = categoryDocumentId(categoryName);
  return (word.categories ?? []).some(
    name => name.trim() && categoryDocumentId(name) === categoryId
  );
};

/**
 * Delete a whole set: the provided member cards plus the category document
 * itself. Callers supply the member list (filtered with isWordInCategory
 * from data they already hold) rather than this function re-querying it:
 * after a partial multi-batch failure, a fresh query would no longer see the
 * already-deleted cards, permanently skipping their counter decrements for
 * other categories they belonged to. Retrying with the same list replays the
 * exact same deletion set, which deleteFlashcards applies idempotently.
 */
export const deleteCategoryWithWords = async (
  userId: string,
  categoryName: string,
  words: Array<Pick<VocabularyWord, 'id' | 'categories'>>
): Promise<void> => {
  try {
    await deleteFlashcards(userId, words);
    await deleteDoc(
      doc(db, 'users', userId, 'categories', categoryDocumentId(categoryName))
    );
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};
