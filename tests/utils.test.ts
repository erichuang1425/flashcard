import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { sanitizeText, isValidText } from '../src/utils/textSanitizer';
import { capitalizeFirstWord, capitalizeAfterPunctuation } from '../src/utils/helpers';
import { calculateSuccessRate, isCardMature, getNextCardState, isDueForReview } from '../src/utils/spaced-repetition';

// textSanitizer tests

test('sanitizeText removes disallowed characters', () => {
  const input = 'Hello 世界!';
  const result = sanitizeText(input);
  assert.strictEqual(result, 'Hello !');
});

test('isValidText detects valid text', () => {
  assert.strictEqual(isValidText('Hello'), true);
  assert.strictEqual(isValidText('Hi 世界'), false);
});

// helpers tests

test('capitalizeFirstWord capitalizes first character', () => {
  assert.strictEqual(capitalizeFirstWord('hello world'), 'Hello world');
});

test('capitalizeAfterPunctuation works with periods and exclamations', () => {
  const input = 'hello. how are you? i am fine! thanks';
  const output = 'Hello. How are you? I am fine! Thanks';
  assert.strictEqual(capitalizeAfterPunctuation(input), output);
});

// spaced-repetition tests

test('calculateSuccessRate handles zero reviews', () => {
  assert.strictEqual(calculateSuccessRate(0, 0), 100);
  assert.strictEqual(calculateSuccessRate(10, 2), 80);
});

test('isCardMature returns true when interval >= 21', () => {
  assert.strictEqual(isCardMature({ interval: 25 }), true);
  assert.strictEqual(isCardMature({ interval: 10 }), false);
});

test('getNextCardState transitions from NEW to LEARNING and REVIEW', () => {
  assert.strictEqual(getNextCardState('NEW', 0, [1,2]), 'LEARNING');
  assert.strictEqual(getNextCardState('NEW', 2, [1,2]), 'REVIEW');
  assert.strictEqual(getNextCardState('REVIEW', 0, [1,2]), 'REVIEW');
});

test('isDueForReview handles undefined and past dates', () => {
  assert.strictEqual(isDueForReview(undefined), true);
  const past = new Date(Date.now() - 1000);
  assert.strictEqual(isDueForReview(past), true);
  const future = new Date(Date.now() + 1000);
  assert.strictEqual(isDueForReview(future), false);
});
