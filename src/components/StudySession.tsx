import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Button, Alert } from '@mui/material';
import { FlashCard } from './FlashCard';
import { calculateNextReview } from '../utils/spaced-repetition';
import { updateCardReview } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import type { Flashcard } from '../types';

interface StudySessionSummary {
  duration: number;
  cardsStudied: number;
  accuracy: number;
  streak: number;
  masteredCards: number;
}

interface StudySessionProps {
  cards: Flashcard[];
  onComplete: (summary: StudySessionSummary) => void;
}

export const StudySession: React.FC<StudySessionProps> = ({ cards, onComplete }) => {
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
  const handleRating = async (rating: 1 | 2 | 3 | 4 | 5) => {
    if (currentIndex >= cards.length) return;
    
    setIsLoading(true);
    const card = cards[currentIndex];
    if (!card.id) return;
    const { nextReview, newDifficulty } = calculateNextReview(rating, card.difficulty);
    const { user } = useAuth();

    try {
      const isCorrect = rating >= 3;
      const isMastered = rating >= 4;
      
      if (!user) return;
      await updateCardReview(user.uid, card.id, nextReview, newDifficulty);
      
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
        Card {currentIndex + 1} of {cards.length}
      </Typography>
      
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
          variant="contained"
          onClick={() => setShowAnswer(!showAnswer)}
          fullWidth={true}
          sx={{ 
            height: { xs: 48, sm: 'auto' },
            fontSize: { xs: '1rem', sm: 'inherit' }
          }}
        >
          {showAnswer ? 'Show Word' : 'Show Answer'}
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
          Next Card
        </Button>
      </Box>

      {stats.completed && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Session Complete! Total Cards: {stats.cardsStudied}
        </Alert>
      )}
    </Box>
  );
};
