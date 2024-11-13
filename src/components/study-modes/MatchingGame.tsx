import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Grid } from '@mui/material';
import type { Flashcard } from '../../types';

interface Props {
  cards: Flashcard[];
  onComplete: (score: number) => void;
}

export const MatchingGame: React.FC<Props> = ({ cards, onComplete }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [words, setWords] = useState<string[]>([]);
  const [definitions, setDefinitions] = useState<string[]>([]);

  useEffect(() => {
    const shuffledWords = shuffle(cards.map(c => c.word));
    const shuffledDefs = shuffle(cards.map(c => c.englishDefinition));
    setWords(shuffledWords);
    setDefinitions(shuffledDefs);
  }, [cards]);

  const handleSelect = (item: string, isWord: boolean) => {
    if (matched.has(item)) return;

    if (!selected) {
      setSelected(item);
      return;
    }

    const card = cards.find(c => 
      (isWord && c.englishDefinition === selected && c.word === item) ||
      (!isWord && c.word === selected && c.englishDefinition === item)
    );

    if (card) {
      setMatched(prev => new Set([...Array.from(prev), card.word, card.englishDefinition]));
    }
    setSelected(null);

    if (matched.size === (cards.length * 2) - 2) {
      onComplete(matched.size / 2);
    }
  };

  const isSelected = (item: string) => selected === item;
  const isMatched = (item: string) => matched.has(item);

  return (
    <Paper sx={{ p: 3, width: '100%', maxWidth: 800 }}>
      <Typography variant="h6" gutterBottom align="center">
        Match the words with their definitions
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          {words.map((word) => (
            <Button
              key={word}
              fullWidth
              variant={isSelected(word) ? 'contained' : 'outlined'}
              disabled={isMatched(word)}
              onClick={() => handleSelect(word, true)}
              sx={{ mb: 1, textTransform: 'none' }}
            >
              {word}
            </Button>
          ))}
        </Grid>
        <Grid item xs={6}>
          {definitions.map((def) => (
            <Button
              key={def}
              fullWidth
              variant={isSelected(def) ? 'contained' : 'outlined'}
              disabled={isMatched(def)}
              onClick={() => handleSelect(def, false)}
              sx={{ mb: 1, textTransform: 'none' }}
            >
              {def}
            </Button>
          ))}
        </Grid>
      </Grid>
    </Paper>
  );
};

const shuffle = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};