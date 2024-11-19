import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import type { Flashcard } from '../../types';
import { saveStudyProgress } from '../../services/firestore';
import { useI18n } from '../../i18n/I18nContext';
import { capitalizeFirstWord } from '../../utils/text';

interface Props {
  card: Flashcard;
  onAnswer: (correct: boolean) => void;
}

export const FillInBlanks: React.FC<Props> = ({ card, onAnswer }) => {
  const { t } = useI18n();
  const [answer, setAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const startTime = React.useRef(Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    const isCorrect = answer.toLowerCase().trim() === card.word.toLowerCase().trim();
    setShowResult(true);
    

    await saveStudyProgress(card.userId, {
      cardId: card.id,
      rating: isCorrect ? 4 : 2,
      isCorrect,
      mode: 'fillInBlanks',
      timeSpent: Date.now() - startTime.current
    });

    // Reset timer for next card
    startTime.current = Date.now();

    setTimeout(() => {
      onAnswer(isCorrect);
      setAnswer('');
      setShowResult(false);
    }, 1500);
  };

  return (
    <Paper sx={{ p: 3, width: '100%', maxWidth: 600 }}>
      <Box component="form" onSubmit={handleSubmit}>
        {/* Show only Chinese translation and part of speech before answering */}
        <Typography variant="h4" align="center" gutterBottom>
          {card.chineseTranslation}
        </Typography>
        <Typography 
          variant="subtitle1" 
          align="center" 
          color="text.secondary" 
          gutterBottom
        >
          {card.partOfSpeech}
        </Typography>
        
        {/* Only show English definition after showing result */}
        {showResult && (
          <Typography variant="body1" sx={{ mt: 2, mb: 3 }}>
            {capitalizeFirstWord(card.englishDefinition)}
          </Typography>
        )}
        
        <TextField
          fullWidth
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t('study.fillInBlanks.placeholder')}
          disabled={showResult}
          autoFocus
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
          {t('study.controls.next')}
        </Button>
      </Box>
    </Paper>
  );
};