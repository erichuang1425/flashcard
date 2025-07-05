import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { estimateReadingTime } from '../src/utils/writingMetrics';

const text200 = 'word '.repeat(200);
const text250 = 'word '.repeat(250);

test('estimateReadingTime rounds up to nearest minute', () => {
  assert.strictEqual(estimateReadingTime(text200, 200), 1);
  assert.strictEqual(estimateReadingTime(text250, 200), 2);
});
