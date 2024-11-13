import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';
import { getUserFlashcards } from '../../services/firestore';
import type { Flashcard } from '../../types';
import { capitalizeFirstWord } from '../../utils/helpers';

interface Props {
  card: Flashcard;
  onAnswer: (correct: boolean) => void;
}

export const MultipleChoice: React.FC<Props> = ({ card, onAnswer }): JSX.Element => {
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [canProceed, setCanProceed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

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
            `${capitalizeFirstWord(`not ${card.englishDefinition}`)}`,
            `${capitalizeFirstWord(`different from ${card.englishDefinition}`)}`,
            `${capitalizeFirstWord(`opposite of ${card.englishDefinition}`)}`
          ];
          setOptions(shuffle([capitalizeFirstWord(card.englishDefinition), ...fallbackOptions]));
        } else {
          // Normal case with similar cards
          const wrongOptions = shuffle(similarCards)
            .slice(0, 3)
            .map(c => capitalizeFirstWord(c.englishDefinition));
          setOptions(shuffle([capitalizeFirstWord(card.englishDefinition), ...wrongOptions]));
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
    if (showResult || !option) return;
    
    setSelected(option);
    setShowResult(true);
    
    const correct = capitalizeFirstWord(card.englishDefinition) === option;
    setIsCorrect(correct);
    
    if (correct) {
      // Move to next question automatically if correct
      setTimeout(() => {
        onAnswer(true);
        setSelected(null);
        setShowResult(false);
        setOptions([]);
      }, 1000);
    } else {
      // Show correct answer and wait for user to proceed
      setCanProceed(true);
    }
  };

  const handleProceed = () => {
    onAnswer(false);
    setSelected(null);
    setShowResult(false);
    setOptions([]);
    setCanProceed(false);
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
                    ? option === capitalizeFirstWord(card.englishDefinition)
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
            
            {showResult && !isCorrect && canProceed && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleProceed}
                sx={{ mt: 2 }}
              >
                Continue
              </Button>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
};

const shuffle = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};