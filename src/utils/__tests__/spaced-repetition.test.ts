import { calculateNextReview, isDueForReview } from '../spaced-repetition';

describe('calculateNextReview', () => {
  const baseDate = new Date('2024-01-01T00:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(baseDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('increments difficulty for high rating and schedules next review', () => {
    const { nextReview, newDifficulty } = calculateNextReview(5, 2);
    expect(newDifficulty).toBe(3);
    const expected = new Date(baseDate);
    expected.setHours(expected.getHours() + 72);
    expect(nextReview).toEqual(expected);
  });

  it('decrements difficulty for low rating and schedules next review', () => {
    const { nextReview, newDifficulty } = calculateNextReview(1, 3);
    expect(newDifficulty).toBe(2);
    const expected = new Date(baseDate);
    expected.setHours(expected.getHours() + 24);
    expect(nextReview).toEqual(expected);
  });

  it('keeps difficulty the same for neutral rating', () => {
    const { newDifficulty } = calculateNextReview(3, 2);
    expect(newDifficulty).toBe(2);
  });
});

describe('isDueForReview', () => {
  const baseDate = new Date('2024-01-01T00:00:00Z');

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
