export const calculateNextReview = (rating: 1 | 2 | 3 | 4 | 5, currentDifficulty: number): { nextReview: Date; newDifficulty: number } => {

  const baseIntervals = [4, 8, 24, 72, 168, 336]; // 4h, 8h, 1d, 3d, 1w, 2w
  
  let newDifficulty = currentDifficulty;
  if (rating <= 2) newDifficulty = Math.max(0, currentDifficulty - 1);
  if (rating >= 4) newDifficulty = Math.min(5, currentDifficulty + 1);

  const interval = baseIntervals[newDifficulty];
  const nextReview = new Date();
  nextReview.setHours(nextReview.getHours() + interval);

  return { nextReview, newDifficulty };
};

export const isDueForReview = (nextReview: Date | undefined): boolean => {
  if (!nextReview) return true;
  return new Date() >= new Date(nextReview);
};
