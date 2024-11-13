import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import type { Flashcard } from '../../types';

interface Props {
  card: Flashcard;
  onAnswer: (correct: boolean) => void;
}

export const FillInBlanks: React.FC<Props> = ({ card, onAnswer }) => {
  const [answer, setAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = answer.toLowerCase().trim() === card.word.toLowerCase().trim();
    setIsCorrect(correct);
    setShowResult(true);
    setTimeout(() => {
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
          <Alert severity={isCorrect ? 'success' : 'error'} sx={{ mb: 2 }}>
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