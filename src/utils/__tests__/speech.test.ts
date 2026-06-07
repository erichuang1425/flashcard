import { getEnglishVoices, pickDefaultVoice, accentLabel } from '../speech';

// Minimal fake of SpeechSynthesisVoice for the pure helpers under test.
const makeVoice = (
  name: string,
  lang: string,
  opts: { default?: boolean; localService?: boolean } = {}
): SpeechSynthesisVoice =>
  ({
    name,
    lang,
    voiceURI: `${name}-${lang}`,
    default: opts.default ?? false,
    localService: opts.localService ?? false,
  } as SpeechSynthesisVoice);

describe('getEnglishVoices', () => {
  it('keeps only voices whose lang starts with "en"', () => {
    const voices = [
      makeVoice('Samantha', 'en-US'),
      makeVoice('Amelie', 'fr-FR'),
      makeVoice('Daniel', 'en-GB'),
      makeVoice('Yuki', 'ja-JP'),
    ];
    const result = getEnglishVoices(voices);
    expect(result.map((v) => v.name)).toEqual(['Samantha', 'Daniel']);
  });

  it('returns an empty array when there are no English voices', () => {
    expect(getEnglishVoices([makeVoice('Amelie', 'fr-FR')])).toEqual([]);
  });
});

describe('pickDefaultVoice', () => {
  it('returns undefined when no English voice is available', () => {
    expect(pickDefaultVoice([makeVoice('Amelie', 'fr-FR')])).toBeUndefined();
  });

  it('prefers a high-quality en-US voice over a plain one', () => {
    const voices = [
      makeVoice('Basic', 'en-GB'),
      makeVoice('Google US English', 'en-US'),
      makeVoice('Plain', 'en-US'),
    ];
    expect(pickDefaultVoice(voices)?.name).toBe('Google US English');
  });

  it('falls back to any English voice when none are high quality', () => {
    const voices = [makeVoice('Daniel', 'en-GB', { default: true })];
    expect(pickDefaultVoice(voices)?.name).toBe('Daniel');
  });
});

describe('accentLabel', () => {
  it('maps known English locales to friendly names', () => {
    expect(accentLabel('en-US')).toBe('American');
    expect(accentLabel('en-GB')).toBe('British');
    expect(accentLabel('en-au')).toBe('Australian');
  });

  it('returns the raw tag for unknown locales', () => {
    expect(accentLabel('en-XX')).toBe('en-XX');
  });
});
