
import { translateToTraditionalChinese } from '../translationService';

describe('Translation Service', () => {
  it('should translate English to Traditional Chinese', async () => {
    const mockResponse = {
      data: {
        translations: [{ translatedText: '測試' }]
      }
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    ) as jest.Mock;

    const result = await translateToTraditionalChinese('test');
    expect(result).toBe('測試');
  });

  it('should handle translation errors', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Translation failed'))
    ) as jest.Mock;

    await expect(translateToTraditionalChinese('test')).rejects.toThrow('Translation failed');
  });
});