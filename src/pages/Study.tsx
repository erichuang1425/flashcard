import React, { useCallback, useEffect, useState } from 'react';
import { Container, Typography, Box, Button, Paper, Alert, AlertTitle, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { getUserFlashcards, updateCardReview } from '../services/firestore';
import { FlashCard } from '../components/FlashCard';
import { StudyProgress } from '../components/StudyProgress';
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

// Shared shell for the error / empty / complete screens so they render as a
// centered card (with safe-area padding) instead of bare top-left text.
const CenteredState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Container
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // `vh` base with a `dvh` override so engines without dynamic-viewport
      // units still get a usable height (same pattern as the rest of Study).
      minHeight: '70vh',
      '@supports (min-height: 100dvh)': { minHeight: '70dvh' },
      px: 2,
      // Centered shells render outside the Layout content padding for these
      // branches, so inset the bottom for the home indicator on tall iPhones.
      pb: 'env(safe-area-inset-bottom, 0px)',
    }}
  >
    <Paper sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 460, textAlign: 'center' }}>
      {children}
    </Paper>
  </Container>
);

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
  // Start in a loading state so the initial render shows a spinner rather than
  // briefly flashing the "No cards due" empty state before the fetch resolves.
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Container sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        '@supports (min-height: 100dvh)': { minHeight: '50dvh' },
      }}>
        <CircularProgress aria-label="Loading flashcards" />
      </Container>
    );
  }

  if (error) {
    return (
      <CenteredState>
        <Alert severity="error" sx={{ textAlign: 'left' }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
        <Button variant="contained" onClick={resetSession} sx={{ mt: 3 }}>
          Try Again
        </Button>
      </CenteredState>
    );
  }

  if (!cards.length) {
    return (
      <CenteredState>
        <Typography variant="h4" gutterBottom>🎉</Typography>
        <Typography variant="h6" gutterBottom>All caught up!</Typography>
        <Typography color="text.secondary">
          No cards are due for study right now. Come back later, or add more
          words to your library.
        </Typography>
      </CenteredState>
    );
  }

  if (isComplete) {
    const accuracy = progress.cardsReviewed > 0
      ? Math.round((progress.correct / progress.cardsReviewed) * 100)
      : 0;
    return (
      <CenteredState>
        <Typography variant="h4" gutterBottom>🎉</Typography>
        <Typography variant="h5" gutterBottom>Study session complete!</Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 3,
            my: 3,
          }}
        >
          <Box>
            <Typography variant="h4">{progress.cardsReviewed}</Typography>
            <Typography variant="body2" color="text.secondary">Reviewed</Typography>
          </Box>
          <Box>
            <Typography variant="h4" color="success.main">{progress.correct}</Typography>
            <Typography variant="body2" color="text.secondary">Correct</Typography>
          </Box>
          <Box>
            <Typography variant="h4" color="error.main">{progress.incorrect}</Typography>
            <Typography variant="body2" color="text.secondary">Incorrect</Typography>
          </Box>
          <Box>
            <Typography variant="h4">{accuracy}%</Typography>
            <Typography variant="body2" color="text.secondary">Accuracy</Typography>
          </Box>
        </Box>
        <Button variant="contained" onClick={resetSession}>
          Start New Session
        </Button>
      </CenteredState>
    );
  }

  return (
    <Container maxWidth="xl" sx={{
      py: { xs: 2, sm: 3 },
      // Fill the Layout scroll container rather than the full viewport (which
      // is already shortened by the AppBar), so the page doesn't overflow by a
      // navbar height.
      minHeight: '100%'
    }}>
      <Box sx={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, sm: 3 },
      }}>
        {/* Progress Panel */}
        <Box sx={{
          position: { xs: 'static', md: 'sticky' },
          top: { xs: 0, md: 24 },
          alignSelf: { md: 'flex-start' },
          width: { xs: '100%', md: '300px' },
          // Cap (not fix) the height to the dynamic viewport minus the AppBar
          // (64px) and the sticky top offset (24px) so the panel never grows
          // taller than its scroll container — the old fixed `100vh` height
          // ignored that the container is already AppBar-offset and clipped /
          // added phantom scroll. `vh` base with a `dvh` override.
          maxHeight: { md: 'calc(100vh - 88px)' },
          '@supports (height: 100dvh)': {
            maxHeight: { md: 'calc(100dvh - 88px)' },
          },
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
          // `vh` base with a `dvh` override so engines without dynamic-viewport
          // units (iOS < 15.4) still get a usable min-height instead of dropping
          // the bare `dvh` declaration and collapsing the column.
          minHeight: { xs: '50vh', sm: '60vh' },
          '@supports (min-height: 100dvh)': {
            minHeight: { xs: '50dvh', sm: '60dvh' },
          },
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
