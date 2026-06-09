import { isoDate, previousIsoDate, nextStreak, updateRunningAverage } from '../study-stats';

describe('isoDate', () => {
  it('formats an instant as a UTC YYYY-MM-DD string', () => {
    expect(isoDate(new Date('2026-06-09T15:30:00Z'))).toBe('2026-06-09');
  });

  it('defaults to today', () => {
    expect(isoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('previousIsoDate', () => {
  it('returns the calendar date one day earlier', () => {
    expect(previousIsoDate(new Date('2026-06-09T00:00:00Z'))).toBe('2026-06-08');
  });

  it('rolls back across a month boundary', () => {
    expect(previousIsoDate(new Date('2026-03-01T12:00:00Z'))).toBe('2026-02-28');
  });

  it('rolls back across a year boundary', () => {
    expect(previousIsoDate(new Date('2026-01-01T12:00:00Z'))).toBe('2025-12-31');
  });
});

describe('nextStreak', () => {
  const today = '2026-06-09';
  const yesterday = '2026-06-08';

  it('increments when the last session was yesterday', () => {
    expect(nextStreak(4, yesterday, today, yesterday)).toBe(5);
  });

  it('leaves the streak unchanged when already studied today (idempotent)', () => {
    expect(nextStreak(4, today, today, yesterday)).toBe(4);
  });

  it('resets to 1 after a multi-day gap', () => {
    expect(nextStreak(7, '2026-06-01', today, yesterday)).toBe(1);
  });

  it('resets to 1 when there is no prior study date', () => {
    expect(nextStreak(0, undefined, today, yesterday)).toBe(1);
  });
});

describe('updateRunningAverage', () => {
  it('returns the new value when there were no prior samples', () => {
    expect(updateRunningAverage(0, 0, 90)).toBe(90);
  });

  it('folds a new sample into an existing average', () => {
    // avg 80 over 2 sessions, add 95 → (80*2 + 95) / 3 = 85
    expect(updateRunningAverage(80, 2, 95)).toBe(85);
  });

  it('matches a from-scratch mean over a sequence', () => {
    const values = [70, 100, 40, 90];
    let avg = 0;
    values.forEach((v, i) => {
      avg = updateRunningAverage(avg, i, v);
    });
    const expected = values.reduce((a, b) => a + b, 0) / values.length;
    expect(avg).toBeCloseTo(expected, 10);
  });
});
