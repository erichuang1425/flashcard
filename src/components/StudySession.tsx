import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Button, Alert, LinearProgress } from '@mui/material';
import { FlashCard } from './FlashCard';
import { calculateNextReview } from '../utils/spaced-repetition';
import { updateCardReview } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import type { Flashcard } from '../types';

interface StudySessionSummary {
  duration: number;
  cardsStudied: number;
  accuracy: number;
  streak: number;
  masteredCards: number;
}

interface StudyProgress {
  currentIndex: number;
  stats: {
    correct: number;
    streak: number;
    mastered: number;
    completed: boolean;
    cardsStudied: number;
  };
  sessionStart: Date;
  cards: Flashcard[];
}

interface StudySessionProps {
  cards: Flashcard[];
  onComplete: (summary: StudySessionSummary) => void;
  onSaveExit?: (progress: StudyProgress) => void;
}

// Move Rating type and helper function before the component
// Define allowed ratings type
type Rating = 1 | 2 | 3 | 4 | 5;

// Add helper function for calculating difficulty
const calculateNewDifficulty = (currentDifficulty: number, rating: Rating): number => {
  if (rating >= 4) return Math.max(currentDifficulty - 1, 0);
  if (rating <= 2) return Math.min(currentDifficulty + 1, 5);
  return currentDifficulty;
};

export const StudySession: React.FC<StudySessionProps> = ({ cards, onComplete, onSaveExit }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStart] = useState(new Date());
  const [stats, setStats] = useState({
    correct: 0,
    streak: 0,
    mastered: 0,
    completed: false,
    cardsStudied: 0
  });
  // Fix the rating type in handleRating
  const handleRating = async (rating: Rating) => {
    if (isLoading || !user) return;
    setIsLoading(true);
  
    try {
      const card = cards[currentIndex];
      const isCorrect = rating >= 3;
      const isMastered = rating >= 4;
      const newDifficulty = calculateNewDifficulty(card.difficulty, rating);
      const { nextReview } = calculateNextReview(rating, newDifficulty); // Fix: Use object destructuring to get nextReview
      
      await updateCardReview(
        user.uid,
        card.id,
        nextReview, // Fix: Pass nextReview date directly 
        newDifficulty,
        isMastered
      );
      
      setStats(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        streak: isCorrect ? prev.streak + 1 : 0,
        mastered: prev.mastered + (isMastered ? 1 : 0),
        cardsStudied: prev.cardsStudied + 1,
        completed: prev.completed
      }));
  
      if (currentIndex === cards.length - 1) {
        const duration = (new Date().getTime() - sessionStart.getTime()) / 1000;
        onComplete({
          duration,
          cardsStudied: cards.length,
          accuracy: (stats.correct / cards.length) * 100,
          streak: stats.streak,
          masteredCards: stats.mastered
        });
        setStats(prev => ({ ...prev, completed: true }));
      } else {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!cards.length) return 0;
    return Math.round((currentIndex / cards.length) * 100);
  };

  const handleSaveExit = () => {
    if (onSaveExit) {
      onSaveExit({
        currentIndex,
        stats: {
          ...stats,
          completed: false,
          cardsStudied: currentIndex
        },
        sessionStart,
        cards
      });
    }
  };

  const handleNextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ 
      mt: { xs: 1, sm: 2 },
      display: 'flex',
      flexDirection: 'column',
      gap: { xs: 2, sm: 3 }
    }}>
      <Typography 
        variant="body2" 
        gutterBottom 
        sx={{ 
          textAlign: 'center',
          fontSize: { xs: '1rem', sm: 'inherit' }
        }}
      >
        {t('study.progress.cardsProgress', {
          values: { 
            reviewed: currentIndex,
            total: cards.length
          }
        })}
      </Typography>

      <LinearProgress 
        variant="determinate" 
        value={calculateProgress()}
        sx={{ height: 8, borderRadius: 1 }}
      />
      
      <FlashCard
        card={cards[currentIndex]}
        onRating={showAnswer ? handleRating : undefined}
        showAnswer={showAnswer}
      />
      
      <Box sx={{ 
        mt: { xs: 1, sm: 2 }, 
        display: 'flex', 
        justifyContent: 'center',
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' }
      }}>
        <Button
          variant="outlined"
          onClick={handleSaveExit}
          fullWidth={true}
          sx={{ 
            height: { xs: 48, sm: 'auto' },
            fontSize: { xs: '1rem', sm: 'inherit' }
          }}
        >
          {t('study.controls.saveExit')}
        </Button>
        <Button 
          variant="contained"
          onClick={() => setShowAnswer(!showAnswer)}
          fullWidth={true}
          sx={{ 
            height: { xs: 48, sm: 'auto' },
            fontSize: { xs: '1rem', sm: 'inherit' }
          }}
        >
          {showAnswer ? t('study.controls.hideAnswer') : t('study.controls.showAnswer')}
        </Button>

        <Button
          variant="outlined"
          onClick={handleNextCard}
          fullWidth={true}
          sx={{ 
            height: { xs: 48, sm: 'auto' },
            fontSize: { xs: '1rem', sm: 'inherit' }
          }}
        >
          {t('study.controls.next')}
        </Button>
      </Box>

      {stats.completed && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('study.progress.sessionComplete')}
          {t(`study.progress.totalCards_${stats.cardsStudied}`)}
        </Alert>
      )}
    </Box>
  );
};
