import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';
import { getUserFlashcards } from '../../services/firestore';
import type { Flashcard } from '../../types';

interface Props {
  card: Flashcard;
  onAnswer: (correct: boolean) => void;
}

export const MultipleChoice: React.FC<Props> = ({ card, onAnswer }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        // Get similar cards based on part of speech or difficulty
        const allCards = await getUserFlashcards(card.userId);
        const similarCards = allCards.filter(c => 
          c.id !== card.id && 
          (c.partOfSpeech === card.partOfSpeech || c.difficulty === card.difficulty)
        );
        
        if (similarCards.length < 3) {
          // Fallback options if not enough similar cards
          const fallbackOptions = [
            `Not ${card.englishDefinition}`,
            `Different from ${card.englishDefinition}`,
            `Opposite of ${card.englishDefinition}`
          ];
          setOptions(shuffle([card.englishDefinition, ...fallbackOptions]));
        } else {
          // Normal case with similar cards
          const wrongOptions = shuffle(similarCards)
            .slice(0, 3)
            .map(c => c.englishDefinition);
          setOptions(shuffle([card.englishDefinition, ...wrongOptions]));
        }
        setError(null);
      } catch (err) {
        console.error('Error loading options:', err);
        setError('Failed to load options');
      }
    };

    loadOptions();
  }, [card]);

  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelected(option);
    const isCorrect = option === card.englishDefinition;
    setShowResult(true);
    setTimeout(() => {
      onAnswer(isCorrect);
      setSelected(null);
      setShowResult(false);
    }, 1500);
  };

  return (
    <Paper sx={{ p: 3, width: '100%', maxWidth: 600 }}>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : (
        <>
          <Typography variant="h4" align="center" gutterBottom>
            {card.word}
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            {card.partOfSpeech}
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            {options.map((option) => (
              <Button
                key={option}
                variant={selected === option ? 'contained' : 'outlined'}
                onClick={() => handleSelect(option)}
                color={
                  showResult
                    ? option === card.englishDefinition
                      ? 'success'
                      : selected === option
                      ? 'error'
                      : 'primary'
                    : 'primary'
                }
                sx={{ py: 2, textAlign: 'left', textTransform: 'none' }}
              >
                {option}
              </Button>
            ))}
          </Box>
        </>
      )}
    </Paper>
  );
};

const shuffle = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};