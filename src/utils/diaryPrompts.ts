export interface DiaryPrompt {
  id: string;
  text: string;
}

export const diaryPrompts: DiaryPrompt[] = [
  { id: 'gratitude', text: 'What are you grateful for today?' },
  { id: 'challenge', text: 'Describe a recent challenge and how you handled it.' },
  { id: 'learning', text: 'What is something new you learned this week?' },
  { id: 'goal', text: 'Write about a goal you want to achieve.' },
  { id: 'appreciation', text: 'Who is someone you appreciate and why?' }
];
