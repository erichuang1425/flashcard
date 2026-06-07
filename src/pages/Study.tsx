import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Button, Paper, Alert, AlertTitle } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { getUserFlashcards, updateCardReview } from '../services/firestore';
import { FlashCard } from '../components/FlashCard';
import { StudyProgress } from '../components/StudyProgress';
import { StudyFeedback } from '../components/StudyFeedback';
import { calculateNextReview } from '../utils/spaced-repetition';
import type { Flashcard, StudyProgress as StudyProgressType } from '../types';
import { StudyModeSelector } from '../components/study-modes/StudyModeSelector';
import type { StudyMode } from '../types';
import { FillInBlanks } from '../components/study-modes/FillInBlanks';
import { MatchingGame } from '../components/study-modes/MatchingGame';
import { MultipleChoice } from '../components/study-modes/MultipleChoice';
import { FillInPuzzle } from '../components/study-modes/FillInPuzzle';
import { updateUserXP } from '../services/gamification';

const PUZZLE_BATCH_SIZE = 8;

export const Study: React.FC = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState<StudyProgressType>({
    correct: 0,
    incorrect: 0,
    streak: 0,
    cardsReviewed: 0
  });
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcard');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCards = async () => {
      if (user) {
        try {
          const allCards = await getUserFlashcards(user.uid);
          const now = new Date();
          const dueCards = allCards.filter(card => {
            // Include cards with no next review date
            if (!card.nextReview) return true;
            
            // Ensure nextReview is a Date object
            const reviewDate = card.nextReview instanceof Date 
              ? card.nextReview 
              : new Date(card.nextReview);
              
            return reviewDate <= now;
          });
          
          if (dueCards.length > 0) {
            setCards(dueCards);
            setError(null);
          } else {
            setError('No cards due for review');
          }
        } catch (err) {
          console.error('Error loading cards:', err);
          setError('Failed to load flashcards. Please check your connection and try again.');
        }
      }
    };
    loadCards();
  }, [user]);

  const validModes = ['flashcard', 'multipleChoice', 'fillInBlanks', 'matching', 'fillInPuzzle'] as const;
  
  useEffect(() => {

    if (!validModes.includes(studyMode)) {
      setStudyMode('flashcard');
    }
  }, [studyMode]);

  const handleAnswer = async (isCorrect: boolean) => {
    if (!user || currentIndex >= cards.length) return;
    
    const xpGained = isCorrect ? 8 : 3;
    await updateUserXP(user.uid, xpGained);
    
    await handleRating(isCorrect ? 4 : 2);
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4 | 5) => {
    if (!user || currentIndex >= cards.length) return;
    
    const card = cards[currentIndex];
    if (!card.id) return; 
    
    const { nextReview, newDifficulty } = calculateNextReview(rating, card.difficulty);
    await updateCardReview(user.uid, card.id, nextReview, newDifficulty);

    // Add XP based on rating
    const xpGained = rating >= 4 ? 10 : rating >= 3 ? 5 : 2;
    await updateUserXP(user.uid, xpGained);

    setProgress(prev => ({
      correct: prev.correct + (rating >= 3 ? 1 : 0),
      incorrect: prev.incorrect + (rating < 3 ? 1 : 0),
      streak: rating >= 3 ? prev.streak + 1 : 0,
      cardsReviewed: prev.cardsReviewed + 1
    }));

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setIsComplete(true);
    }
  };

  const handleMatchingComplete = async (correct: number) => {
    if (!user) return;
    
    const xpGained = correct * 5;
    await updateUserXP(user.uid, xpGained);
    
    setCurrentIndex(prev => prev + 6);
    setProgress(prev => ({
      ...prev,
      correct: prev.correct + correct,
      incorrect: prev.incorrect + (6 - correct),
      streak: correct === 6 ? prev.streak + 1 : 0,
      cardsReviewed: prev.cardsReviewed + 6
    }));
  };

  const handlePuzzleComplete = async (correct: number) => {
    if (!user) return;

    const batch = cards.slice(currentIndex, currentIndex + PUZZLE_BATCH_SIZE);
    const xpGained = correct * 6;
    await updateUserXP(user.uid, xpGained);

    setProgress(prev => ({
      ...prev,
      correct: prev.correct + correct,
      incorrect: prev.incorrect + (batch.length - correct),
      streak: correct === batch.length ? prev.streak + 1 : 0,
      cardsReviewed: prev.cardsReviewed + batch.length
    }));

    if (currentIndex + PUZZLE_BATCH_SIZE >= cards.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex(prev => prev + PUZZLE_BATCH_SIZE);
    }
  };

  const renderStudyMode = () => {
    switch (studyMode) {
      case 'flashcard':
        return (
          <FlashCard 
            card={cards[currentIndex]}
            onRating={showAnswer ? handleRating : undefined}
            showAnswer={showAnswer}
          />
        );
      case 'multipleChoice':
        return <MultipleChoice card={cards[currentIndex]} onAnswer={handleAnswer} />;
      case 'fillInBlanks':
        return <FillInBlanks card={cards[currentIndex]} onAnswer={handleAnswer} />;
      case 'matching':
        return <MatchingGame cards={cards.slice(currentIndex, currentIndex + 6)} onComplete={handleMatchingComplete} />;
      case 'fillInPuzzle':
        return (
          <FillInPuzzle
            key={currentIndex}
            cards={cards.slice(currentIndex, currentIndex + PUZZLE_BATCH_SIZE)}
            onComplete={handlePuzzleComplete}
          />
        );
    }
  };

  const renderShowAnswerButton = () => {
    if (studyMode !== 'flashcard') return null;
    
    return (
      <Button 
        variant="contained"
        size="large"
        onClick={() => setShowAnswer(!showAnswer)}
        sx={{ 
          minWidth: '200px',
          height: '56px',
          fontSize: '1.1rem',
          fontWeight: 600,
        }}
      >
        {showAnswer ? 'Show Word' : 'Show Answer'}
      </Button>
    );
  };

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!cards.length) {
    return (
      <Container>
        <Typography variant="h6">No cards due for study!</Typography>
      </Container>
    );
  }

  if (isComplete) {
    return (
      <Container>
        <Typography variant="h6">Study session complete!</Typography>
        <Button onClick={() => window.location.reload()}>Start New Session</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ 
      py: { xs: 2, sm: 3 },
      minHeight: '100vh'
    }}>
      <Box sx={{
        minHeight: { xs: 'calc(100vh - 64px)', sm: 'calc(100vh - 48px)' },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, sm: 3 },
      }}>
        {/* Progress Panel */}
        <Box sx={{
          position: { xs: 'static', md: 'sticky' },
          top: { xs: 0, md: 24 },
          width: { xs: '100%', md: '300px' },
          height: { xs: 'auto', md: 'calc(100vh - 96px)' },
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 2, 
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          order: { xs: 2, md: 1 }
        }}>
          <StudyProgress progress={progress} total={cards.length} />
          <StudyModeSelector mode={studyMode} onModeChange={setStudyMode} />
          <Typography 
            variant="body2" 
            sx={{ textAlign: 'center', color: 'text.secondary' }}
          >
            Card {currentIndex + 1} of {cards.length}
          </Typography>
        </Box>

        {/* Main Content Area */}
        <Box sx={{ 
          flex: 1,
          minHeight: { xs: '50vh', sm: '60vh' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          order: { xs: 1, md: 2 },
          pt: { xs: 0, md: 2 }
        }}>
          {renderStudyMode()}
          {renderShowAnswerButton()}
        </Box>
      </Box>
    </Container>
  );
};
