import { StudyQueue, QueueItemPerformance } from '../types';
import { ReviewResult } from './spaced-repetition';

const ensureDate = (date: Date | any): Date => {
  if (date instanceof Date) return date;
  if (date?.toDate instanceof Function) return date.toDate();
  if (typeof date === 'string') return new Date(date);
  return new Date();
};

export const calculateNewQueuePositionWithPerformance = (
  queue: StudyQueue[],
  card: StudyQueue,
  review: ReviewResult
): number => {
  const basePosition = calculateBasePosition(queue, card, review);
  if (!card.performance) return basePosition;
  const successRate = card.performance.correctAttempts / card.performance.totalAttempts;
  const streak = card.performance.streakCount;
  if (successRate < 0.6) {
    return Math.max(0, basePosition - Math.floor(queue.length * 0.2));
  }
  if (successRate > 0.8 && streak > 2) {
    return Math.min(queue.length, basePosition + Math.floor(queue.length * 0.1));
  }
  return basePosition;
};

export const sortStudyQueueWithPerformance = (queue: StudyQueue[]): StudyQueue[] => {
  const now = new Date();
  
  return queue.sort((a, b) => {
    const stateOrder = { 'RELEARN': 0, 'LEARNING': 1, 'REVIEW': 2, 'NEW': 3 };
    const stateDiff = stateOrder[a.state] - stateOrder[b.state];
    if (stateDiff !== 0) return stateDiff;
    const aPerf = a.performance;
    const bPerf = b.performance;
    
    if (aPerf && bPerf) {
      const aSuccess = aPerf.correctAttempts / aPerf.totalAttempts;
      const bSuccess = bPerf.correctAttempts / bPerf.totalAttempts;
      if (Math.abs(aSuccess - bSuccess) > 0.2) {
        return bSuccess - aSuccess;
      }
    }
    return calculateStandardSortOrder(a, b, now);
  });
};

const calculateBasePosition = (
  queue: StudyQueue[], 
  card: StudyQueue,
  review: ReviewResult
): number => {
  const now = new Date();

  switch (review.state) {
    case 'RELEARN':
      return 0;
      
    case 'LEARNING':
      const lastRelearn = findLastByState(queue, 'RELEARN');
      const sameStep = queue.filter(c => 
        c.state === 'LEARNING' && c.interval === card.interval
      ).length;
      return Math.max(lastRelearn + 1, lastRelearn + 1 + sameStep);
      
    case 'REVIEW':
      const dueDate = new Date(now.getTime() + review.interval * 24 * 60 * 60 * 1000);
      return findPositionByDueDate(queue, dueDate);
      
    default:
      return queue.length;
  }
};

const calculateStandardSortOrder = (a: StudyQueue, b: StudyQueue, now: Date): number => {
  const aNextReview = ensureDate(a.nextReview);
  const bNextReview = ensureDate(b.nextReview);
  
  if (a.state === 'REVIEW' && b.state === 'REVIEW') {
    const aOverdue = aNextReview < now;
    const bOverdue = bNextReview < now;
    
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    return aNextReview.getTime() - bNextReview.getTime();
  }

  if (a.state === b.state) {
    return (a.position || 0) - (b.position || 0);
  }

  return 0;
};

const findLastByState = (queue: StudyQueue[], state: string): number => {
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].state === state) return i;
  }
  return -1;
};

const findPositionByDueDate = (queue: StudyQueue[], dueDate: Date): number => {
  return queue.findIndex(item => ensureDate(item.nextReview) > dueDate) ?? queue.length;
};

export const cleanupQueue = (queue: StudyQueue[]): StudyQueue[] => {
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const seenCardIds = new Set<string>();
  
  return queue
    .filter(item => {
      if (seenCardIds.has(item.cardId)) return false;
      seenCardIds.add(item.cardId);

      if ((item.state === 'RELEARN' || item.state === 'LEARNING') && 
          item.lastReviewed && 
          ensureDate(item.lastReviewed) < oneMonthAgo) {
        return false;
      }

      return true;
    })
    .map(item => ({
      ...item,
      nextReview: ensureDate(item.nextReview),
      lastReviewed: item.lastReviewed ? ensureDate(item.lastReviewed) : undefined,
      state: isValidState(item.state) ? item.state : 'NEW',
      interval: Math.max(0, item.interval || 0),
      easeFactor: validateEaseFactor(item.easeFactor)
    }));
};

export const rebalanceQueue = (queue: StudyQueue[]): StudyQueue[] => {
  const now = new Date();
  const rebalancedQueue = [...queue];
  const groups = {
    RELEARN: [] as StudyQueue[],
    LEARNING: [] as StudyQueue[],
    REVIEW: [] as StudyQueue[],
    NEW: [] as StudyQueue[]
  };

  rebalancedQueue.forEach(item => groups[item.state].push(item));

  Object.values(groups).forEach(group => {
    group.sort((a, b) => {
      if (a.nextReview && b.nextReview) {
        return a.nextReview.getTime() - b.nextReview.getTime();
      }
      return 0;
    });
  });

  return [
    ...groups.RELEARN,
    ...groups.LEARNING,
    ...groups.REVIEW.filter(item => item.nextReview <= now),
    ...groups.NEW,
    ...groups.REVIEW.filter(item => item.nextReview > now)
  ].map((item, index) => ({
    ...item,
    position: index
  }));
};

const isValidState = (state: string): state is StudyQueue['state'] => {
  return ['NEW', 'LEARNING', 'REVIEW', 'RELEARN'].includes(state);
};

const validateEaseFactor = (easeFactor: number): number => {
  const MIN_EASE = 1.3;
  const MAX_EASE = 3.0;
  const DEFAULT_EASE = 2.5;

  if (!easeFactor || isNaN(easeFactor)) return DEFAULT_EASE;
  return Math.min(Math.max(easeFactor, MIN_EASE), MAX_EASE);
};

export const validateQueue = (queue: StudyQueue[]): { 
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cardIds = new Set<string>();

  queue.forEach((item, index) => {
    if (cardIds.has(item.cardId)) {
      errors.push(`Duplicate card found: ${item.cardId}`);
    }
    cardIds.add(item.cardId);

    if (!isValidState(item.state)) {
      errors.push(`Invalid state for card ${item.cardId}: ${item.state}`);
    }

    if (item.interval < 0) {
      errors.push(`Invalid interval for card ${item.cardId}: ${item.interval}`);
    }

    if (item.easeFactor < 1.3 || item.easeFactor > 3.0) {
      warnings.push(`Unusual ease factor for card ${item.cardId}: ${item.easeFactor}`);
    }

    if (item.position !== index) {
      warnings.push(`Position mismatch for card ${item.cardId}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const reorderQueueWithRating = (
  queue: StudyQueue[],
  card: StudyQueue,
  rating: number,
  insertIndex: number
): StudyQueue[] => {
  const newQueue = queue.filter(c => c.cardId !== card.cardId);
  
  if (rating <= 2) {
    const lastRelearnIndex = newQueue.findIndex(c => c.state !== 'RELEARN');
    return [
      ...newQueue.slice(0, lastRelearnIndex + 1),
      card,
      ...newQueue.slice(lastRelearnIndex + 1)
    ];
  }
  
  newQueue.splice(insertIndex, 0, card);
  return newQueue;
};

export const updateQueuePerformance = (
  queue: StudyQueue[],
  cardId: string,
  rating: number,
  newPosition: number
) => {
  const cardIndex = queue.findIndex(c => c.cardId === cardId);
  if (cardIndex === -1) return queue;

  const card = queue[cardIndex];
  return [
    ...queue.slice(0, cardIndex),
    {
      ...card,
      performance: {
        ...card.performance,
        totalAttempts: (card.performance?.totalAttempts || 0) + 1,
        correctAttempts: (card.performance?.correctAttempts || 0) + (rating >= 3 ? 1 : 0),
        lastPosition: newPosition
      }
    },
    ...queue.slice(cardIndex + 1)
  ];
};