import { useCallback, useEffect, useState } from 'react';
import { audioManager } from '../utils/audio/AudioManager';
import { SoundEffect } from '../utils/audio/soundEffects';

export const useAudio = () => {
  const [isMuted, setIsMuted] = useState(false);

  const playSound = useCallback((effect: SoundEffect) => {
    audioManager.play(effect);
  }, []);

  const toggleMute = useCallback(() => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  }, []);

  const setVolume = useCallback((volume: number) => {
    audioManager.setVolume(volume);
  }, []);

  return { playSound, toggleMute, isMuted, setVolume };
};