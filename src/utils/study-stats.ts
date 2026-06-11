/**
 * Pure date/stat helpers for the study-stats writers in `services/firestore.ts`.
 * Kept free of any Firestore dependency so the streak and running-average math
 * — a classic source of off-by-one, idempotency and timezone bugs — can be unit
 * tested without standing up the database.
 */

/**
 * The YYYY-MM-DD calendar date of an instant in a given time zone. `en-CA`
 * renders dates in ISO order; when `timeZone` is omitted the runtime's local
 * zone is used (which, in the browser, is the user's own zone). Streaks are a
 * human "did I study today?" notion, so they must be computed against the
 * user's local calendar day — using UTC made users west of UTC lose streaks
 * when studying in the evening.
 */
export const isoDate = (date: Date = new Date(), timeZone?: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

/**
 * The local calendar date one day before `date` (in `timeZone`). Computed by
 * arithmetic on the local date parts rather than subtracting 24h, so DST
 * transitions (23/25-hour days) can't skip or repeat a day.
 */
export const previousIsoDate = (date: Date = new Date(), timeZone?: string): string => {
  const [year, month, day] = isoDate(date, timeZone).split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().split('T')[0];
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
