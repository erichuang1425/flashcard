/**
 * Pure date/stat helpers for the study-stats writers in `services/firestore.ts`.
 * Kept free of any Firestore dependency so the streak and running-average math
 * — a classic source of off-by-one, idempotency and timezone bugs — can be unit
 * tested without standing up the database.
 */

/** ISO calendar date (YYYY-MM-DD, UTC) for a given instant. */
export const isoDate = (date: Date = new Date()): string =>
  date.toISOString().split('T')[0];

/** The ISO calendar date one day before `date` (UTC). */
export const previousIsoDate = (date: Date = new Date()): string => {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

/**
 * The streak value after a study session today, given the previous streak and
 * the date of the last recorded session:
 * - last session was yesterday → the streak continues (+1)
 * - last session was already today → unchanged (idempotent within a day)
 * - any other gap (or no prior session) → reset to 1
 */
export const nextStreak = (
  currentStreak: number,
  lastStudyDate: string | undefined,
  today: string,
  yesterday: string
): number => {
  if (lastStudyDate === yesterday) return currentStreak + 1;
  if (lastStudyDate !== today) return 1;
  return currentStreak;
};

/**
 * Incremental running mean: fold one new value into an existing average without
 * keeping the full history. Equivalent to recomputing
 * `sum(values) / count` but in O(1).
 */
export const updateRunningAverage = (
  previousAverage: number,
  previousCount: number,
  newValue: number
): number => (previousAverage * previousCount + newValue) / (previousCount + 1);
