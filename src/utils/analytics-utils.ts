import { LearningCurveData } from '@/types/flashcard';
import { StudyQueue, FlashcardReviewLog } from '../types';

export const calculateRetentionRate = (reviews: FlashcardReviewLog[]): number => {
  if (!reviews.length) return 0;
  const successful = reviews.filter(r => r.rating >= 3).length;
  return (successful / reviews.length) * 100;
};

export const analyzeLearningCurve = (
  reviews: FlashcardReviewLog[]
): LearningCurveData => {
  const dataPoints = reviews.map((review, index) => ({
    attemptNumber: index + 1,
    rating: review.rating,
    timestamp: review.timestamp
  }));

  return {
    intervals: dataPoints.map((dp, i) => i > 0 ? Number(dp.timestamp) - Number(dataPoints[i-1].timestamp) : 0),
    accuracyRates: dataPoints.map(dp => (dp.rating / 5) * 100),
    retentionScores: dataPoints.map((dp, i, arr) => 
      arr.slice(0, i + 1).reduce((sum, r) => sum + r.rating, 0) / (i + 1)
    ),
    reviewCounts: dataPoints.map((_, i) => i + 1)
  };
};
