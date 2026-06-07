import React, { useCallback, useEffect, useState } from 'react';
import { Container, Typography, Box, Button, Paper, Alert, AlertTitle } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { getUserFlashcards, updateCardReview } from '../services/firestore';
import { FlashCard } from '../components/FlashCard';
import { StudyProgress } from '../components/StudyProgress';
import { StudyFeedback } from '../components/StudyFeedback';
import { scheduleCardReview } from '../utils/spaced-repetition';
import type { BatchResult } from '../components/study-modes/types';
import type { Flashcard, StudyProgress as StudyProgressType } from '../types';
import { StudyModeSelector } from '../components/study-modes/StudyModeSelector';
import type { StudyMode } from '../types';
import { FillInBlanks } from '../components/study-modes/FillInBlanks';
import { MatchingGame } from '../components/study-modes/MatchingGame';
import { MultipleChoice } from '../components/study-modes/MultipleChoice';
import { FillInPuzzle } from '../components/study-modes/FillInPuzzle';
import { updateUserXP } from '../services/gamification';

const PUZZLE_BATCH_SIZE = 8;
const MATCHING_BATCH_SIZE = 6;

export const Study: React.FC = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  // Full deck kept around so study modes that need distractors (e.g. Multiple
  // Choice) don't have to refetch every card from Firestore.
  const [deck, setDeck] = useState<Flashcard[]>([]);
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

  const loadCards = useCallback(async () => {
    if (!user) return;
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

      setDeck(allCards);

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
  }, [user]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Switching modes mid-session would otherwise leave the answer revealed and,
  // for batch modes, slice from a stale position — reset the per-card UI state
  // whenever the mode changes.
  useEffect(() => {
    setShowAnswer(false);
  }, [studyMode]);

  const resetSession = useCallback(() => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsComplete(false);
    setProgress({ correct: 0, incorrect: 0, streak: 0, cardsReviewed: 0 });
    loadCards();
  }, [loadCards]);

  const validModes = ['flashcard', 'multipleChoice', 'fillInBlanks', 'matching', 'fillInPuzzle'] as const;
  
  useEffect(() => {

    if (!validModes.includes(studyMode)) {
      setStudyMode('flashcard');
    }
  }, [studyMode]);

  const handleAnswer = async (isCorrect: boolean) => {
    if (!user || currentIndex >= cards.length) return;

    // Map the binary correct/incorrect result onto a review rating. XP is
    // awarded inside handleRating, so it must not be awarded again here —
    // doing so previously double-counted XP for multiple-choice and
    // fill-in-the-blanks compared with standard flashcard reviews.
    await handleRating(isCorrect ? 4 : 2);
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4 | 5) => {
    if (!user || currentIndex >= cards.length) return;
    
    const card = cards[currentIndex];
    if (!card.id) return; 
    
    const schedule = scheduleCardReview(card, rating);
    await updateCardReview(user.uid, card.id, schedule);

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

  // Shared completion handler for the batch modes (Matching, Crossword). Each
  // reviewed card is run through the spaced-repetition scheduler individually so
  // these modes actually affect scheduling — previously they never did. The
  // `batchSize` is how far to advance through the deck (which can exceed the
  // number of scored cards when a batch contains cards the mode couldn't use).
  const handleBatchComplete = async (results: BatchResult[], batchSize: number) => {
    if (!user) return;

    let correct = 0;
    for (const result of results) {
      const card = cards.find(c => c.id === result.id);
      if (!card?.id) continue;
      const schedule = scheduleCardReview(card, result.correct ? 4 : 2);
      await updateCardReview(user.uid, card.id, schedule);
      if (result.correct) correct++;
    }

    await updateUserXP(user.uid, correct * 5);

    setProgress(prev => ({
      ...prev,
      correct: prev.correct + correct,
      incorrect: prev.incorrect + (results.length - correct),
      streak: results.length > 0 && correct === results.length ? prev.streak + 1 : 0,
      cardsReviewed: prev.cardsReviewed + results.length
    }));

    if (currentIndex + batchSize >= cards.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex(prev => prev + batchSize);
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
        return <MultipleChoice card={cards[currentIndex]} deck={deck} onAnswer={handleAnswer} />;
      case 'fillInBlanks':
        return <FillInBlanks card={cards[currentIndex]} onAnswer={handleAnswer} />;
      case 'matching': {
        const batch = cards.slice(currentIndex, currentIndex + MATCHING_BATCH_SIZE);
        return (
          <MatchingGame
            key={`matching-${currentIndex}`}
            cards={batch}
            onComplete={(results) => handleBatchComplete(results, batch.length)}
          />
        );
      }
      case 'fillInPuzzle': {
        const batch = cards.slice(currentIndex, currentIndex + PUZZLE_BATCH_SIZE);
        return (
          <FillInPuzzle
            key={`puzzle-${currentIndex}`}
            cards={batch}
            onComplete={(results) => handleBatchComplete(results, batch.length)}
          />
        );
      }
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
        <Button onClick={resetSession}>Start New Session</Button>
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
          {/* On desktop the mode selector lives in the sidebar; on mobile it's
              rendered at the top of the content area instead (see below) so it
              isn't pushed below the fold. */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <StudyModeSelector mode={studyMode} onModeChange={setStudyMode} />
          </Box>
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
          gap: { xs: 2, md: 3 },
          order: { xs: 1, md: 2 },
          pt: { xs: 0, md: 2 }
        }}>
          <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%' }}>
            <StudyModeSelector mode={studyMode} onModeChange={setStudyMode} />
          </Box>
          {renderStudyMode()}
          {renderShowAnswerButton()}
        </Box>
      </Box>
    </Container>
  );
};
