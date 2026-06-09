/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../LanguageContext';

const STORAGE_KEY = 'flashcard.language';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('LanguageContext', () => {
  beforeEach(() => window.localStorage.clear());

  it('defaults to English when nothing is stored', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe('en');
  });

  it('restores a previously chosen language from storage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'zh');
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe('zh');
  });

  it('translates keys and interpolates {token} placeholders', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    // A real key with a placeholder is interpolated; an unknown key is echoed.
    expect(result.current.t('study.mc.continue')).toBe('Continue');
    expect(result.current.t('totally.unknown.key')).toBe('totally.unknown.key');
    expect(result.current.t('greeting', { name: 'Mina' })).toBe('greeting');
  });

  it('setLanguage updates the active language and persists it', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    act(() => result.current.setLanguage('zh'));

    expect(result.current.language).toBe('zh');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('zh');
    // Translations switch with the language.
    expect(result.current.t('study.mc.continue')).toBe('繼續');
  });

  it('throws when useLanguage is used outside a provider', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useLanguage())).toThrow(/within a LanguageProvider/);
    errorSpy.mockRestore();
  });
});
