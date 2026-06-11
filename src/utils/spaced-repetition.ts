import type { Flashcard } from '../types';

/**
 * SM-2 based spaced-repetition scheduler.
 *
 * Cards carry three pieces of scheduling state — `easeFactor` (how quickly the
 * interval grows), `interval` (current spacing in whole days) and
 * `repetitions` (consecutive successful recalls). New or lapsed cards sit in a
 * short "learning" step measured in minutes; once recalled they graduate to
 * day-scale intervals that grow by the ease factor, the way Anki does.
 *
 * Ratings are the 1–5 scale already used by the UI:
 *   1 Again · 2 Hard · 3 Good · 4 Easy · 5 Perfect
 */

export type Rating = 1 | 2 | 3 | 4 | 5;

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;

/** Cards whose interval reaches this many days are considered mastered/mature. */
export const MASTERED_INTERVAL_DAYS = 21;

/** Largest interval we'll ever schedule, in days. */
export const MAX_INTERVAL_DAYS = 365;

/** How long a new/lapsed card waits in the learning step, in minutes. */
export const LEARNING_STEP_MINUTES = 10;

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Extra interval credited per day a card was reviewed past its due date. A card
 * recalled well after a long gap clearly deserves a longer interval than one
 * recalled right on schedule, so we fold in half the lateness (Anki's overdue
 * bonus, simplified). Only applied to already-graduated cards answered "Good"
 * or better; the result is still capped by {@link MAX_INTERVAL_DAYS}.
 */
const OVERDUE_CREDIT_PER_DAY = 0.5;

/** Ease adjustment applied per rating, Anki-style. */
const EASE_DELTA: Record<Rating, number> = {
  1: -0.2,
  2: -0.15,
  3: 0,
  4: 0.15,
  5: 0.15,
};

/** Interval multiplier bonus for confident answers (on top of the ease factor). */
const INTERVAL_BONUS: Record<Rating, number> = {
  1: 1,
  2: 1,
  3: 1,
  4: 1.15,
  5: 1.3,
};

export interface SrsState {
  /** SM-2 ease multiplier (>= 1.3). */
  easeFactor: number;
  /** Current interval in whole days (0 while in the learning step). */
  interval: number;
  /** Consecutive successful recalls. */
  repetitions: number;
}

export interface ReviewSchedule extends SrsState {
  /** When the card next becomes due. */
  nextReview: Date;
  /** 0 (easy) – 5 (hard), derived from ease for queries and display. */
  difficulty: number;
  /** True once the card's interval reaches the mastery threshold. */
  mastered: boolean;
}

const clampEase = (ease: number): number =>
  Math.min(MAX_EASE, Math.max(MIN_EASE, ease));

const addDays = (from: Date, days: number): Date => {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Map the ease factor onto a coarse 0–5 difficulty so the rest of the app
 * (Firestore mastery queries, simple UI badges) keeps working. Higher ease ⇒
 * lower difficulty.
 */
const difficultyFromEase = (ease: number): number =>
  Math.round(((MAX_EASE - clampEase(ease)) / (MAX_EASE - MIN_EASE)) * 5);

/**
 * Read the SRS state off a card, filling in sensible defaults for cards created
 * before these fields existed.
 */
export const getSrsState = (
  card: Partial<Pick<Flashcard, 'easeFactor' | 'interval' | 'repetitions' | 'difficulty'>>
): SrsState => ({
  easeFactor: clampEase(card.easeFactor ?? DEFAULT_EASE),
  interval: Math.max(0, card.interval ?? 0),
  repetitions: Math.max(0, card.repetitions ?? 0),
});

/**
 * Compute the next schedule for a card given the user's rating.
 *
 * @param state   current SRS state (use {@link getSrsState} to derive it from a card)
 * @param rating  1–5 recall quality
 * @param now     injectable clock for deterministic tests
 * @param dueDate when the card was scheduled to be reviewed; used to credit
 *                overdue reviews. Omit (or pass a future date) for cards that
 *                aren't late.
 */
export const scheduleReview = (
  state: SrsState,
  rating: Rating,
  now: Date = new Date(),
  dueDate?: Date
): ReviewSchedule => {
  const easeFactor = clampEase(state.easeFactor + EASE_DELTA[rating]);
  let { interval, repetitions } = state;
  let nextReview: Date;

  if (rating === 1) {
    // Lapse: drop back into the learning step and forget prior progress.
    repetitions = 0;
    interval = 0;
    nextReview = new Date(now.getTime() + LEARNING_STEP_MINUTES * MINUTE_MS);
  } else if (rating === 2 && interval < 1) {
    // "Hard" while still learning: repeat the learning step.
    nextReview = new Date(now.getTime() + LEARNING_STEP_MINUTES * MINUTE_MS);
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      // Graduating interval: a confident first recall jumps further ahead.
      interval = rating >= 4 ? 4 : 1;
    } else if (rating === 2) {
      // Hard on a graduated card: nudge the interval up only slightly.
      interval = Math.max(1, Math.round(interval * 1.2));
    } else if (repetitions === 2 && interval < 6) {
      interval = Math.round(6 * INTERVAL_BONUS[rating]);
    } else {
      interval = Math.round(interval * easeFactor * INTERVAL_BONUS[rating]);
    }
    // Overdue credit: a graduated card recalled well after its due date earns
    // a bonus for the extra elapsed time it survived in memory.
    if (rating >= 3 && state.interval >= 1 && dueDate) {
      const daysLate = Math.floor((now.getTime() - dueDate.getTime()) / DAY_MS);
      if (daysLate > 0) {
        interval = Math.max(
          interval,
          Math.round(interval + daysLate * OVERDUE_CREDIT_PER_DAY)
        );
      }
    }
    interval = Math.min(interval, MAX_INTERVAL_DAYS);
    nextReview = addDays(now, interval);
  }

  return {
    easeFactor,
    interval,
    repetitions,
    nextReview,
    difficulty: difficultyFromEase(easeFactor),
    mastered: interval >= MASTERED_INTERVAL_DAYS,
  };
};

/**
 * Convenience wrapper: schedule a review straight from a card.
 */
export const scheduleCardReview = (
  card: Partial<Pick<Flashcard, 'easeFactor' | 'interval' | 'repetitions' | 'difficulty' | 'nextReview'>>,
  rating: Rating,
  now: Date = new Date()
): ReviewSchedule => {
  const dueDate = card.nextReview
    ? card.nextReview instanceof Date
      ? card.nextReview
      : new Date(card.nextReview)
    : undefined;
  return scheduleReview(getSrsState(card), rating, now, dueDate);
};

export const isDueForReview = (nextReview: Date | undefined): boolean => {
  if (!nextReview) return true;
  return new Date() >= new Date(nextReview);
};
