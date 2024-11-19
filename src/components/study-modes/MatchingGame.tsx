import React, { useState, useEffect } from 'react';
import { Box, Paper, Grid, Button, Typography, Alert } from '@mui/material';
import type { Flashcard } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { saveStudyProgress } from '../../services/firestore';

interface Props {
  cards: Flashcard[];
  onComplete: (count: number) => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const MatchingGame: React.FC<Props> = ({ cards, onComplete }) => {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [options, setOptions] = useState<{words: string[], definitions: string[]}>({words: [], definitions: []});

  useEffect(() => {
    setSelected(null);
    setMatched(new Set());
    setFeedback(null);
  }, [currentCardIndex]);

  const handleSelect = async (item: string, isWord: boolean) => {
    if (matched.has(item)) return;

    const currentCard = cards[currentCardIndex];

    if (!selected) {
      setSelected(item);
      return;
    }

    const isMatch = isWord 
      ? currentCard.englishDefinition === selected && currentCard.word === item
      : currentCard.word === selected && currentCard.englishDefinition === item;

    if (isMatch) {
      const newMatched = new Set([...Array.from(matched), item, selected]);
      setMatched(newMatched);
      setFeedback({ message: t('study.matching.pairFound'), type: 'success' });
      
      // Only mark current card as completed when its pair is matched
      if (newMatched.has(currentCard.word) && newMatched.has(currentCard.englishDefinition)) {
        await saveStudyProgress(currentCard.userId, {
          cardId: currentCard.id,
          rating: 4,
          isCorrect: true,
          mode: 'matching',
          timeSpent: 0 
        });


        const remainingCards = cards.filter((card, idx) => 
          idx > currentCardIndex && !Array.from(newMatched).includes(card.word)
        );
        
        // Generate new options including next card and random distractors
        const newOptions = {
          words: [currentCard.word],
          definitions: [currentCard.englishDefinition]
        };

       
        const shuffledRemaining = shuffleArray(remainingCards).slice(0, 3);
        shuffledRemaining.forEach(card => {
          if (newOptions.words.length < 3) newOptions.words.push(card.word);
          if (newOptions.definitions.length < 3) newOptions.definitions.push(card.englishDefinition);
        });


        newOptions.words = shuffleArray(newOptions.words);
        newOptions.definitions = shuffleArray(newOptions.definitions);
        

        setOptions(newOptions);
        
        setTimeout(() => {
          setCurrentCardIndex(prev => prev + 1);
        }, 1000);
      }
    } else {
      setFeedback({ message: t('study.matching.pairNotFound'), type: 'error' });
    }
    
    setTimeout(() => {
      setSelected(null);
      setFeedback(null);
    }, 1500);
  };

  const currentCard = cards[currentCardIndex];
  if (!currentCard) {
    onComplete(currentCardIndex);
    return null;
  }
  // Generate initial options including current card and some distractors
  useEffect(() => {
    const initialOptions = {
      words: [currentCard.word],
      definitions: [currentCard.englishDefinition]
    };


    cards.slice(0, 4).forEach(card => {
      if (card.id !== currentCard.id) {
        if (initialOptions.words.length < 3) initialOptions.words.push(card.word);
        if (initialOptions.definitions.length < 3) initialOptions.definitions.push(card.englishDefinition);
      }
    });

    setOptions(initialOptions);
  }, [currentCard, cards]);
  // Add 2-3 distractor options
  cards.slice(0, 4).forEach(card => {
    if (card.id !== currentCard.id) {
      if (options.words.length < 3) options.words.push(card.word);
      if (options.definitions.length < 3) options.definitions.push(card.englishDefinition);
    }
  });

  return (
    <Paper sx={{ p: 3, width: '100%', maxWidth: 800, mx: 'auto' }}>
      {feedback && (
        <Alert 
          severity={feedback.type} 
          sx={{ mb: 2 }}
        >
          {feedback.message}
        </Alert>
      )}
      
      <Grid container spacing={4}>
        <Grid item xs={6}>
          <Typography variant="h6" gutterBottom align="center">
            Words
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {options.words.map((word) => (
              <Button
                key={word}
                variant={selected === word ? 'contained' : 'outlined'}
                onClick={() => handleSelect(word, true)}
                disabled={matched.has(word)}
                sx={{ 
                  p: 2,
                  opacity: matched.has(word) ? 0.7 : 1,
                  bgcolor: matched.has(word) ? 'success.light' : undefined
                }}
              >
                {word}
              </Button>
            ))}
          </Box>
        </Grid>
        
        <Grid item xs={6}>
          <Typography variant="h6" gutterBottom align="center">
            Definitions
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {options.definitions.map((def) => (
              <Button
                key={def}
                variant={selected === def ? 'contained' : 'outlined'}
                onClick={() => handleSelect(def, false)}
                disabled={matched.has(def)}
                sx={{ 
                  p: 2,
                  opacity: matched.has(def) ? 0.7 : 1,
                  bgcolor: matched.has(def) ? 'success.light' : undefined
                }}
              >
                {def}
              </Button>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};