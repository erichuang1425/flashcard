import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { StudyQueue } from '../types';
import { cleanupQueue, rebalanceQueue, validateQueue } from '../utils/queue-utils';
import { logger } from './logging';

const QUEUE_SNAPSHOT_KEY = 'studyQueueSnapshot';
const QUEUE_STATE_KEY = 'queueState';

const MAX_RETRIES = 5;
const BASE_DELAY = 300; // 300ms initial delay

export const saveQueueSnapshot = async (userId: string, queue: StudyQueue[]): Promise<void> => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  let retryCount = 0;
  
  const saveWithRetry = async (): Promise<void> => {
    try {
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        const currentQueue = counterDoc.data()?.metadata?.studyQueue || [];
        
        // Optimistic concurrency check
        const currentVersion = counterDoc.data()?.metadata?.version || 0;
        const newVersion = Date.now();
        
        // Only update if queue has changed
        if (JSON.stringify(currentQueue) !== JSON.stringify(queue)) {
          transaction.update(counterRef, {
            [`metadata.${QUEUE_SNAPSHOT_KEY}`]: {
              queue,
              timestamp: new Date(),
              validation: validateQueue(queue)
            },
            [`metadata.${QUEUE_STATE_KEY}`]: {
              lastSaved: new Date(),
              checksum: calculateQueueChecksum(queue),
              version: newVersion
            },
            'metadata.version': newVersion
          });
        }
      });
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = Math.min(BASE_DELAY * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return saveWithRetry();
      }
      throw error;
    }
  };

  return saveWithRetry();
};

export const restoreQueueState = async (userId: string): Promise<StudyQueue[]> => {
  const counterRef = doc(db, 'users', userId, 'counters', 'flashcards');
  
  try {
    const doc = await getDoc(counterRef);
    const metadata = doc.data()?.metadata;
    let queue = metadata?.studyQueue || [];
    const snapshot = metadata?.[QUEUE_SNAPSHOT_KEY];
    
    if (snapshot && isValidSnapshot(snapshot)) {
      queue = snapshot.queue;
    }
    
    // Validate and clean queue
    const validation = validateQueue(queue);
    if (!validation.isValid) {
      queue = cleanupQueue(queue);
      queue = rebalanceQueue(queue);
      await saveQueueSnapshot(userId, queue);
    }
    
    return queue;
  } catch (error) {
    logger.error('Error restoring queue state:', error as Error);
    return [];
  }
};

const calculateQueueChecksum = (queue: StudyQueue[]): string => {
  return queue
    .map(item => `${item.cardId}:${item.state}:${item.position}`)
    .join('|');
};

const isValidSnapshot = (snapshot: any): boolean => {
  return snapshot &&
    Array.isArray(snapshot.queue) &&
    snapshot.timestamp instanceof Date &&
    snapshot.validation;
};