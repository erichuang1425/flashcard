import { Howl } from 'howler';
import { SoundEffects, SoundEffect } from './soundEffects';

class AudioManager {
  private sounds: Map<SoundEffect, Howl> = new Map();
  private isMuted: boolean = false;

  constructor() {
    Object.entries(SoundEffects).forEach(([key, path]) => {
      this.sounds.set(key as SoundEffect, new Howl({
        src: [path],
        volume: 0.5,
        preload: true,
        html5: true 
      }));
    });
  }

  play(effect: SoundEffect) {
    if (!this.isMuted) {
      this.sounds.get(effect)?.play();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  setVolume(volume: number) {
    this.sounds.forEach(sound => sound.volume(volume));
  }
}

export const audioManager = new AudioManager();