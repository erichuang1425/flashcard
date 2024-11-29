export interface SRSConfig {
  startingEase: number;
  minimumEase: number;
  maximumEase: number;
  learningSteps: number[];
  intervalModifier: number;
  maximumInterval: number;
}

export const DEFAULT_CONFIG: SRSConfig = {
  startingEase: 2.5,
  minimumEase: 1.3,
  maximumEase: 2.8,
  learningSteps: [1, 2, 3], // Shorter steps for quicker reinforcement
  intervalModifier: 1.0,
  maximumInterval: 20 // Maximum cards to wait before seeing again
};

const getReviewInterval = (minutes: number): number => minutes;

export interface ReviewResult {
  nextReview: Date;
  newDifficulty: number;
  interval: number; // This now represents positions to move forward
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN';
  easeFactor: number;
  rating?: 1 | 2 | 3 | 4 | 5;
}

export const getNextCardState = (
  currentState: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN',
  stepIndex: number,
  learningSteps: number[]
): 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN' => {
  if (currentState === 'NEW' || currentState === 'LEARNING') {
    return stepIndex >= learningSteps.length ? 'REVIEW' : 'LEARNING';
  }
  return currentState;
};

export const calculateSuccessRate = (
  totalReviews: number,
  lapseCount: number
): number => {
  if (totalReviews === 0) return 100;
  return ((totalReviews - lapseCount) / totalReviews) * 100;
};

export const isCardMature = (card: { interval: number }): boolean => {
  return card.interval >= 21; // Card is considered mature if interval is 21 days or more
};

export const shouldResetLearningProgress = (
  rating: number,
  easeFactor: number,
  successRate: number
): boolean => {
  return rating === 1 || (rating === 2 && easeFactor < 1.5 && successRate < 60);
};

export const calculateNextReview = (
  rating: 1 | 2 | 3 | 4 | 5,
  difficulty: number,
  currentState: string,
  currentValue: number, // Can be interval or position
  currentEaseFactor: number,
  srsType: 'interval' | 'position' = 'interval'
): ReviewResult => {
  const now = new Date();
  const normalizedDifficulty = Math.max(0, Math.min(5, difficulty || 0));
  const normalizedInterval = Math.max(0, currentValue || 0);
  const normalizedEaseFactor = Math.max(
    DEFAULT_CONFIG.minimumEase,
    Math.min(DEFAULT_CONFIG.maximumEase, currentEaseFactor || DEFAULT_CONFIG.startingEase)
  );
  const validState = ['NEW', 'LEARNING', 'REVIEW', 'RELEARN'].includes(currentState) 
    ? currentState as 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN'
    : 'NEW';

  let nextValue = srsType === 'position' 
    ? calculateNextPosition(rating, currentValue, currentState)
    : calculateNextInterval(rating, currentValue, currentEaseFactor, srsType);

  let newEaseFactor = normalizedEaseFactor;
  let newState = validState;

  // Handle rating-based changes
  if (rating >= 3) {
    // Successful review
    if (validState === 'NEW' || validState === 'LEARNING') {
      const stepIndex = normalizedInterval;
      nextValue = srsType === 'position' 
        ? currentValue + DEFAULT_CONFIG.learningSteps[stepIndex] 
        : DEFAULT_CONFIG.learningSteps[stepIndex];
      
      newState = getNextCardState(validState, stepIndex, DEFAULT_CONFIG.learningSteps);
      
      if (newState === 'REVIEW') {
        // Graduation intervals based on rating
        if (srsType === 'position') {
          switch(rating) {
            case 3: // Good
              nextValue = currentValue + Math.ceil(DEFAULT_CONFIG.learningSteps[DEFAULT_CONFIG.learningSteps.length - 1] * 1.2);
              break;
            case 4: // Easy
              nextValue = currentValue + Math.ceil(DEFAULT_CONFIG.learningSteps[DEFAULT_CONFIG.learningSteps.length - 1] * 1.5);
              break;
            case 5: // Very Easy
              nextValue = currentValue + Math.ceil(DEFAULT_CONFIG.learningSteps[DEFAULT_CONFIG.learningSteps.length - 1] * 2.0);
              break;
          }
        } else {
          nextValue = Math.ceil(DEFAULT_CONFIG.learningSteps[DEFAULT_CONFIG.learningSteps.length - 1] * 1.5);
        }
      }
    } else {
      // Review mode interval calculation
      newEaseFactor = Math.max(
        DEFAULT_CONFIG.minimumEase,
        normalizedEaseFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
      );
      
      nextValue = srsType === 'position'
        ? currentValue + Math.ceil(newEaseFactor * 5) // Position-based increment
        : Math.min(
            DEFAULT_CONFIG.maximumInterval,
            Math.ceil(normalizedInterval * newEaseFactor * DEFAULT_CONFIG.intervalModifier)
          );
    }
  } else {
    // Failed review  
    newState = 'LEARNING';
    if (srsType === 'position') {
      // Failed cards should always appear after 2-3 cards
      nextValue = currentValue + 2; // Fixed value to ensure card appears soon
    } else {
      nextValue = 0;
    }
    newEaseFactor = Math.max(
      DEFAULT_CONFIG.minimumEase,
      normalizedEaseFactor - 0.2
    );
  }

  const nextReview = srsType === 'position' 
    ? now 
    : new Date(now.getTime() + nextValue * 24 * 60 * 60 * 1000);

  return {
    nextReview,
    newDifficulty: normalizedDifficulty,
    state: newState,
    interval: nextValue,
    easeFactor: newEaseFactor
  };
};

const calculateNextPosition = (
  rating: number,
  currentPosition: number,
  state: string
): number => {
  switch(rating) {
    case 1: // Again - Should see within next 1-2 cards
    return currentPosition + 2;
      
    case 2: // Hard - See after 2-3 cards
      return Math.max(0, Math.min(2, currentPosition - Math.floor(currentPosition * 0.7)));
      
    case 3: // Good
      switch(state) {
        case 'NEW':
          return currentPosition + 4;
        case 'LEARNING':
          return currentPosition + 6;
        case 'REVIEW':
          return currentPosition + 8;
        default:
          return currentPosition + 4;
      }
      
    case 4: // Easy
      switch(state) {
        case 'NEW':
          return currentPosition + 8;
        case 'LEARNING':
          return currentPosition + 12;
        case 'REVIEW':
          return currentPosition + 15;
        default:
          return currentPosition + 8;
      }
      
    case 5: // Very Easy
      switch(state) {
        case 'NEW':
          return currentPosition + 12;
        case 'LEARNING':
          return currentPosition + 18;
        case 'REVIEW':
          return currentPosition + 25;
        default:
          return currentPosition + 12;
      }
      
    default:
      return currentPosition;
  }
};

const calculateNextInterval = (
  currentInterval: number,
  easeFactor: number,
  rating: number,
  type: 'interval' | 'position'
): number => {
  if (type === 'position') {
    return Math.ceil(currentInterval * (rating >= 3 ? 1.5 : 0.5));
  }

  if (rating < 3) {
    return Math.max(1, Math.floor(currentInterval * 0.5));
  }

  if (currentInterval === 0) {
    return 1;
  }

  return Math.ceil(currentInterval * easeFactor);
};

export const isDueForReview = (nextReview: Date | undefined): boolean => {
  if (!nextReview) return true;
  return new Date() >= new Date(nextReview);
};
