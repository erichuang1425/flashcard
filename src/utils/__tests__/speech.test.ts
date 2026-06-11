import {
  getEnglishVoices,
  pickDefaultVoice,
  accentLabel,
  isSpeechSupported,
  loadVoices,
  speak,
  cancelSpeech,
} from '../speech';

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
  const t = (key: string) => ({
    'settings.accent.american': '美式英語',
    'settings.accent.british': '英式英語',
    'settings.accent.australian': '澳洲英語',
  }[key] ?? key);

  it('maps known English locales to friendly names', () => {
    expect(accentLabel('en-US', t)).toBe('美式英語');
    expect(accentLabel('en-GB', t)).toBe('英式英語');
    expect(accentLabel('en-au', t)).toBe('澳洲英語');
  });

  it('returns the raw tag for unknown locales', () => {
    expect(accentLabel('en-XX', t)).toBe('en-XX');
  });
});

// The remaining helpers touch the Web Speech API on `window`. The test env is
// `node`, so we stand up a minimal fake `window.speechSynthesis` (and the
// SpeechSynthesisUtterance constructor) per test and tear it down afterward.
describe('Web Speech API wrappers', () => {
  // The list `getVoices()` returns; tests mutate it to simulate async loading.
  let voiceList: SpeechSynthesisVoice[];
  let synth: {
    getVoices: jest.Mock;
    cancel: jest.Mock;
    speak: jest.Mock;
    onvoiceschanged: (() => void) | null;
  };

  class FakeUtterance {
    text: string;
    voice: SpeechSynthesisVoice | null = null;
    lang = '';
    rate = 1;
    pitch = 1;
    constructor(text: string) {
      this.text = text;
    }
  }

  const installSpeech = () => {
    voiceList = [];
    synth = {
      getVoices: jest.fn(() => voiceList),
      cancel: jest.fn(),
      speak: jest.fn(),
      onvoiceschanged: null,
    };
    (global as any).window = { speechSynthesis: synth };
    (global as any).SpeechSynthesisUtterance = FakeUtterance;
  };

  const uninstallSpeech = () => {
    delete (global as any).window;
    delete (global as any).SpeechSynthesisUtterance;
  };

  const voice = (name: string, lang: string): SpeechSynthesisVoice =>
    ({ name, lang, voiceURI: `${name}-${lang}`, default: false, localService: false } as SpeechSynthesisVoice);

  describe('isSpeechSupported', () => {
    afterEach(uninstallSpeech);

    it('is false when there is no window (e.g. SSR / node)', () => {
      expect(isSpeechSupported()).toBe(false);
    });

    it('is false when window lacks speechSynthesis', () => {
      (global as any).window = {};
      expect(isSpeechSupported()).toBe(false);
    });

    it('is true when speechSynthesis is present', () => {
      installSpeech();
      expect(isSpeechSupported()).toBe(true);
    });
  });

  describe('loadVoices', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      installSpeech();
    });
    afterEach(() => {
      jest.useRealTimers();
      uninstallSpeech();
    });

    it('resolves an empty list when speech is unsupported', async () => {
      uninstallSpeech();
      await expect(loadVoices()).resolves.toEqual([]);
    });

    it('resolves immediately when voices are already loaded', async () => {
      voiceList = [voice('Samantha', 'en-US')];
      await expect(loadVoices()).resolves.toEqual(voiceList);
    });

    it('resolves once the onvoiceschanged event fires', async () => {
      const promise = loadVoices();
      // Voices arrive asynchronously, then the browser fires the event.
      voiceList = [voice('Daniel', 'en-GB')];
      synth.onvoiceschanged?.();
      await expect(promise).resolves.toEqual(voiceList);
    });

    it('falls back to the timeout when the event never fires', async () => {
      const promise = loadVoices();
      voiceList = [voice('Karen', 'en-AU')];
      jest.advanceTimersByTime(1000);
      await expect(promise).resolves.toEqual(voiceList);
    });

    it('resolves only once even if event and timeout both fire', async () => {
      const promise = loadVoices();
      voiceList = [voice('Moira', 'en-IE')];
      synth.onvoiceschanged?.();
      jest.advanceTimersByTime(1000); // second trigger must be a no-op
      await expect(promise).resolves.toEqual(voiceList);
    });
  });

  describe('speak', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      installSpeech();
    });
    afterEach(() => {
      jest.useRealTimers();
      uninstallSpeech();
    });

    it('returns null and does nothing when unsupported', () => {
      uninstallSpeech();
      expect(speak('hello', [])).toBeNull();
    });

    it('returns null for blank text without touching the engine', () => {
      expect(speak('   ', [])).toBeNull();
      expect(synth.speak).not.toHaveBeenCalled();
    });

    it('cancels in-flight speech and defers the speak to the next tick', () => {
      const utterance = speak('hello', []);
      expect(utterance).not.toBeNull();
      expect(synth.cancel).toHaveBeenCalledTimes(1);
      // Deferred so iOS WebKit does not wedge the queue.
      expect(synth.speak).not.toHaveBeenCalled();
      jest.runAllTimers();
      expect(synth.speak).toHaveBeenCalledWith(utterance);
    });

    it('applies the chosen voice and its language when the URI matches', () => {
      const voices = [voice('Samantha', 'en-US'), voice('Daniel', 'en-GB')];
      const utterance = speak('hi', voices, { voiceURI: 'Daniel-en-GB' });
      expect(utterance?.voice?.name).toBe('Daniel');
      expect(utterance?.lang).toBe('en-GB');
    });

    it('defaults to en-US and honors rate/pitch when no voice matches', () => {
      const utterance = speak('hi', [], { rate: 1.5, pitch: 0.8 });
      expect(utterance?.lang).toBe('en-US');
      expect(utterance?.rate).toBe(1.5);
      expect(utterance?.pitch).toBe(0.8);
    });
  });

  describe('cancelSpeech', () => {
    afterEach(uninstallSpeech);

    it('cancels current speech when supported', () => {
      installSpeech();
      cancelSpeech();
      expect(synth.cancel).toHaveBeenCalledTimes(1);
    });

    it('is a safe no-op when unsupported', () => {
      expect(() => cancelSpeech()).not.toThrow();
    });
  });
});
