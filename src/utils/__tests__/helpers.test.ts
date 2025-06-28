import { capitalizeAfterPunctuation } from '../helpers';

describe('capitalizeAfterPunctuation', () => {
  it('capitalizes after punctuation with no space', () => {
    expect(capitalizeAfterPunctuation('hello.world')).toBe('Hello.World');
  });

  it('capitalizes after punctuation with spaces', () => {
    expect(capitalizeAfterPunctuation('hello. world!test? ok')).toBe('Hello. World!Test? Ok');
  });
});
