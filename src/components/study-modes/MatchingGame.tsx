import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Grid } from '@mui/material';
import type { Flashcard } from '../../types';
import { shuffle } from '../../utils/helpers';

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
      const newMatched = new Set([...Array.from(matched), card.word, card.englishDefinition]);
      setMatched(newMatched);
      // Check completion against the freshly computed set. Reading the
      // `matched` state here instead would be stale (React batches updates),
      // which previously under-reported the score by one pair and never
      // recognised a perfect round for the streak.
      if (newMatched.size === cards.length * 2) {
        onComplete(newMatched.size / 2);
      }
    }
    setSelected(null);
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
              aria-pressed={isSelected(word)}
              aria-label={`Word: ${word}${isMatched(word) ? ', matched' : ''}`}
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
              aria-pressed={isSelected(def)}
              aria-label={`Definition: ${def}${isMatched(def) ? ', matched' : ''}`}
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