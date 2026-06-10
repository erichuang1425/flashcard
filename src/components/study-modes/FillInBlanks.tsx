import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import type { Flashcard } from '../../types';
import { isFillInBlankCorrect } from './logic';

interface Props {
  card: Flashcard;
  onAnswer: (correct: boolean) => void;
}

export const FillInBlanks: React.FC<Props> = ({ card, onAnswer }) => {
  const [answer, setAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Avoid calling onAnswer / setState after the session has advanced past
  // this card.
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // Reset the form whenever the card changes — the parent may advance the
  // session by other means than our own timer (skip, mode switch), and a
  // pending timer must not register an answer against the new card.
  useEffect(() => {
    clearTimeout(advanceTimer.current);
    setAnswer('');
    setShowResult(false);
    setIsCorrect(false);
  }, [card.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = isFillInBlankCorrect(answer, card.word);
    setIsCorrect(correct);
    setShowResult(true);
    advanceTimer.current = setTimeout(() => {
      onAnswer(correct);
      setAnswer('');
      setShowResult(false);
    }, 1500);
  };

  return (
    <Paper sx={{ p: 3, width: '100%', maxWidth: 600 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Typography variant="body1" gutterBottom>
          {card.englishDefinition.charAt(0).toUpperCase() + card.englishDefinition.slice(1)}
        </Typography>
        {card.chineseTranslation && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {card.chineseTranslation}
          </Typography>
        )}
        <Typography variant="caption" display="block" sx={{ mb: 3 }}>
          Part of Speech: {card.partOfSpeech}
        </Typography>
        
        <TextField
          fullWidth
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type the word"
          disabled={showResult}
          sx={{ mb: 2 }}
        />
        
        {showResult && (
          <Alert severity={isCorrect ? 'success' : 'error'} role="alert" sx={{ mb: 2 }}>
            {isCorrect ? 'Correct!' : `The correct answer is: ${card.word}`}
          </Alert>
        )}
        
        <Button 
          type="submit" 
          variant="contained" 
          fullWidth 
          disabled={!answer.trim() || showResult}
        >
          Check Answer
        </Button>
      </Box>
    </Paper>
  );
};