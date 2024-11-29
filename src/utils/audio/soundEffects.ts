export const SoundEffects = {
  CORRECT_ANSWER: '/assets/sounds/correct.mp3',
  WRONG_ANSWER: '/assets/sounds/incorrect.mp3',
  CARD_FLIP: '/assets/sounds/flip.mp3',
  LEVEL_UP: '/assets/sounds/levelup.mp3',
  STREAK_MILESTONE: '/assets/sounds/streak.mp3',
  PAGE_TURN: '/assets/sounds/page-turn.mp3'
} as const;

export type SoundEffect = keyof typeof SoundEffects;