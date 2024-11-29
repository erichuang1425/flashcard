import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import type { Flashcard } from '../../types';
import { saveStudyProgress } from '../../services/firestore';
import { useI18n } from '../../i18n/I18nContext';
import { capitalizeFirstWord } from '../../utils/text';
import { useAudio } from '../../hooks/useAudio';

interface Props {
  card: Flashcard;
  onAnswer: (correct: boolean) => void;
  useWordAsQuestion?: boolean;
}

export const FillInBlanks: React.FC<Props> = ({ card, onAnswer, useWordAsQuestion = false }) => {
  const { t } = useI18n();
  const { playSound } = useAudio();
  const [answer, setAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const startTime = React.useRef(Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    const correctAnswer = useWordAsQuestion ? card.chineseTranslation : card.word;
    const isCorrect = answer.toLowerCase().trim() === (correctAnswer?.toLowerCase().trim() ?? '');
    
    playSound(isCorrect ? 'CORRECT_ANSWER' : 'WRONG_ANSWER');
    setIsCorrect(isCorrect);
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
        <Typography variant="h4" align="center" gutterBottom>
          {useWordAsQuestion ? card.word : card.chineseTranslation}
        </Typography>
        <Typography 
          variant="subtitle1" 
          align="center" 
          color="text.secondary" 
          gutterBottom
        >
          {card.partOfSpeech}
        </Typography>
        
        {/* Only show definition after showing result */}
        {showResult && (
          <Typography variant="body1" sx={{ mt: 2, mb: 3 }}>
            {useWordAsQuestion ? card.chineseTranslation : card.word}
          </Typography>
        )}
        
        <TextField
          fullWidth
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={useWordAsQuestion ? 
            t('study.fillInBlanks.placeholder') : 
            t('study.fillInBlanks.placeholder')
          }
          disabled={showResult}
          autoFocus
          sx={{ mb: 2 }}
        />
        
        {showResult && (
          <Alert severity={isCorrect ? 'success' : 'error'} sx={{ mb: 2 }}>
            {isCorrect ? 'Correct!' : `The correct answer is: ${useWordAsQuestion ? card.chineseTranslation : card.word}`}
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