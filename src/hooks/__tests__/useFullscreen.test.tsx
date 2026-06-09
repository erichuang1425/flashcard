/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { useFullscreen } from '../useFullscreen';

describe('useFullscreen', () => {
  it('enters and exits fullscreen for the provided element', async () => {
    const element = document.createElement('div');
    const requestFullscreen = jest.fn().mockResolvedValue(undefined);
    const exitFullscreen = jest.fn().mockResolvedValue(undefined);
    let fullscreenElement: Element | null = null;

    Object.defineProperty(element, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    });

    const { result } = renderHook(() =>
      useFullscreen({ current: element })
    );

    await act(async () => result.current.toggleFullscreen());
    expect(requestFullscreen).toHaveBeenCalledTimes(1);

    act(() => {
      fullscreenElement = element;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.isFullscreen).toBe(true);

    await act(async () => result.current.toggleFullscreen());
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });
});
