import {
  scheduleReview,
  scheduleCardReview,
  getSrsState,
  isDueForReview,
  DEFAULT_EASE,
  MIN_EASE,
  MAX_EASE,
  LEARNING_STEP_MINUTES,
  MASTERED_INTERVAL_DAYS,
  type SrsState,
} from '../spaced-repetition';

const baseDate = new Date('2024-01-01T00:00:00Z');

const addDays = (from: Date, days: number) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
};

const newCard = (): SrsState => ({
  easeFactor: DEFAULT_EASE,
  interval: 0,
  repetitions: 0,
});

describe('scheduleReview', () => {
  it('graduates a new card to a 1-day interval on Good', () => {
    const result = scheduleReview(newCard(), 3, baseDate);
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBe(DEFAULT_EASE);
    expect(result.mastered).toBe(false);
    expect(result.nextReview).toEqual(addDays(baseDate, 1));
  });

  it('graduates a new card further on Easy and raises ease', () => {
    const result = scheduleReview(newCard(), 4, baseDate);
    expect(result.interval).toBe(4);
    expect(result.easeFactor).toBeCloseTo(DEFAULT_EASE + 0.15);
    expect(result.nextReview).toEqual(addDays(baseDate, 4));
  });

  it('keeps a new card in the learning step on Again', () => {
    const result = scheduleReview(newCard(), 1, baseDate);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(0);
    expect(result.easeFactor).toBeCloseTo(DEFAULT_EASE - 0.2);
    expect(result.nextReview).toEqual(
      new Date(baseDate.getTime() + LEARNING_STEP_MINUTES * 60 * 1000)
    );
  });

  it('lapses a mature card back into the learning step on Again', () => {
    const mature: SrsState = { easeFactor: 2.5, interval: 40, repetitions: 6 };
    const result = scheduleReview(mature, 1, baseDate);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(0);
    expect(result.mastered).toBe(false);
    expect(result.nextReview).toEqual(
      new Date(baseDate.getTime() + LEARNING_STEP_MINUTES * 60 * 1000)
    );
  });

  it('grows the interval by the ease factor on repeated Good', () => {
    const state: SrsState = { easeFactor: 2.5, interval: 10, repetitions: 3 };
    const result = scheduleReview(state, 3, baseDate);
    expect(result.interval).toBe(25); // round(10 * 2.5)
    expect(result.repetitions).toBe(4);
    expect(result.nextReview).toEqual(addDays(baseDate, 25));
  });

  it('uses the second-step interval of 6 days', () => {
    const state: SrsState = { easeFactor: 2.5, interval: 1, repetitions: 1 };
    const result = scheduleReview(state, 3, baseDate);
    expect(result.interval).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it('only nudges the interval up on Hard for a graduated card', () => {
    const state: SrsState = { easeFactor: 2.5, interval: 10, repetitions: 3 };
    const result = scheduleReview(state, 2, baseDate);
    expect(result.interval).toBe(12); // round(10 * 1.2)
    expect(result.easeFactor).toBeCloseTo(2.5 - 0.15);
  });

  it('marks a card mastered once the interval crosses the threshold', () => {
    const state: SrsState = { easeFactor: 2.5, interval: 12, repetitions: 4 };
    const result = scheduleReview(state, 4, baseDate);
    expect(result.interval).toBeGreaterThanOrEqual(MASTERED_INTERVAL_DAYS);
    expect(result.mastered).toBe(true);
  });

  it('clamps the ease factor to its bounds', () => {
    const low: SrsState = { easeFactor: MIN_EASE, interval: 5, repetitions: 2 };
    expect(scheduleReview(low, 1, baseDate).easeFactor).toBe(MIN_EASE);

    const high: SrsState = { easeFactor: MAX_EASE, interval: 5, repetitions: 2 };
    expect(scheduleReview(high, 5, baseDate).easeFactor).toBe(MAX_EASE);
  });

  it('derives a 0-5 difficulty from the ease factor', () => {
    const easy = scheduleReview({ easeFactor: MAX_EASE, interval: 5, repetitions: 2 }, 3, baseDate);
    expect(easy.difficulty).toBe(0);
    const hard = scheduleReview({ easeFactor: MIN_EASE, interval: 5, repetitions: 2 }, 3, baseDate);
    expect(hard.difficulty).toBe(5);
  });
});

describe('getSrsState', () => {
  it('fills in defaults for legacy cards without SRS fields', () => {
    expect(getSrsState({})).toEqual({
      easeFactor: DEFAULT_EASE,
      interval: 0,
      repetitions: 0,
    });
  });

  it('reads and clamps existing card state', () => {
    expect(getSrsState({ easeFactor: 5, interval: -3, repetitions: 4 })).toEqual({
      easeFactor: MAX_EASE,
      interval: 0,
      repetitions: 4,
    });
  });
});

describe('scheduleCardReview', () => {
  it('schedules straight from a card object', () => {
    const result = scheduleCardReview({ interval: 1, repetitions: 1, easeFactor: 2.5 }, 3, baseDate);
    expect(result.interval).toBe(6);
  });
});

describe('isDueForReview', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(baseDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns true when nextReview is undefined', () => {
    expect(isDueForReview(undefined)).toBe(true);
  });

  it('returns true when the nextReview date is in the past', () => {
    const past = new Date(baseDate);
    past.setHours(past.getHours() - 1);
    expect(isDueForReview(past)).toBe(true);
  });

  it('returns false when the nextReview date is in the future', () => {
    const future = new Date(baseDate);
    future.setHours(future.getHours() + 4);
    expect(isDueForReview(future)).toBe(false);
  });
});
