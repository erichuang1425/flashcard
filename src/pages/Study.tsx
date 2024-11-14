import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Button, Paper, Alert, AlertTitle } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserFlashcards, updateCardReview, saveStudyProgress, loadStudyProgress, clearStudyProgress } from '../services/firestore';
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
import { updateUserXP } from '../services/gamification';
import { useI18n } from '../i18n/I18nContext';
import type { FlashcardsResponse } from '../types/responses';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { db } from '../services/firebase';
import { setDoc, doc } from '@firebase/firestore';

export const Study: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState<StudyProgressType>({
    currentIndex: 0,
    stats: {
      correct: 0,
      incorrect: 0, 
      streak: 0,
      cardsReviewed: 0
    },
    cards: [],
    sessionStart: new Date()
  });
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcard');
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const { preferences } = useUserPreferences();
  const [sessionProgress, setSessionProgress] = useState<StudyProgressType | null>(null);
  const [hasExistingSession, setHasExistingSession] = useState(false);

  const loadCards = async () => {
    if (user) {
      try {
        const response: FlashcardsResponse = await getUserFlashcards(user.uid);
        const now = new Date();
        
        const dueCards = response.cards
          .filter((card: Flashcard) => {
            if (!card.nextReview) return true;
            const reviewDate = card.nextReview instanceof Date 
              ? card.nextReview 
              : new Date(card.nextReview);
            return reviewDate <= now;
          })
          // Limit cards based on preference
          .slice(0, preferences.studyVocabLimit);
        
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

  useEffect(() => {
    loadCards();
  }, [user, preferences.studyVocabLimit]);

  useEffect(() => {
    const checkExistingSession = async () => {
      if (!user) return;
      try {
        const savedProgress = await loadStudyProgress(user.uid);
        if (savedProgress) {
          setHasExistingSession(true);
          setSessionProgress(savedProgress);
        }
      } catch (err) {
        console.error('Error checking saved progress:', err);
      }
    };
    checkExistingSession();
  }, [user]);

  const validModes = ['flashcard', 'multipleChoice', 'fillInBlanks', 'matching'] as const;
  
  useEffect(() => {

    if (!validModes.includes(studyMode)) {
      setStudyMode('flashcard');
    }
  }, [studyMode]);

  const handleAnswer = async (isCorrect: boolean) => {
    if (!user || currentIndex >= cards.length) return;
    
    const xpGained = isCorrect ? 8 : 3;
    await updateUserXP(user.uid, xpGained);
    
    setProgress(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      stats: {
        ...prev.stats,
        correct: prev.stats.correct + (isCorrect ? 1 : 0),
        incorrect: prev.stats.incorrect + (isCorrect ? 0 : 1),
        streak: isCorrect ? prev.stats.streak + 1 : 0,
        cardsReviewed: prev.stats.cardsReviewed + 1
      }
    }));

    // Add these lines to update currentIndex and check completion
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4 | 5) => {
    if (!user || currentIndex >= cards.length) return;
    
    const xpGained = rating >= 4 ? 10 : rating >= 3 ? 5 : 2;
    await updateUserXP(user.uid, xpGained);

    setProgress(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      stats: {
        ...prev.stats,
        correct: prev.stats.correct + (rating >= 3 ? 1 : 0),
        incorrect: prev.stats.incorrect + (rating < 3 ? 1 : 0),
        streak: rating >= 3 ? prev.stats.streak + 1 : 0,
        cardsReviewed: prev.stats.cardsReviewed + 1
      }
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
      currentIndex: prev.currentIndex + 6,
      stats: {
        ...prev.stats,
        correct: prev.stats.correct + correct,
        incorrect: prev.stats.incorrect + (6 - correct),
        streak: correct === 6 ? prev.stats.streak + 1 : 0,
        cardsReviewed: prev.stats.cardsReviewed + 6
      }
    }));
  };

  const handleSaveExit = async (progress: StudyProgressType) => {
    if (!user) return;
    try {
      await saveStudyProgress(user.uid, progress);
      navigate('/');
    } catch (err) {
      console.error('Error saving progress:', err);
      setError('Failed to save progress');
    }
  };

  const handleStartNewSession = async () => {
    if (!user) return;
    try {
      await clearStudyProgress(user.uid);
      setHasExistingSession(false);
      setSessionProgress(null);
      loadCards();
    } catch (err) {
      console.error('Error starting new session:', err);
      setError('Failed to start new session');
    }
  };

  const handleResumeSession = () => {
    if (!sessionProgress) return;
    
    // Ensure we have valid cards array
    if (!sessionProgress.cards || !sessionProgress.cards.length) {
      handleStartNewSession();
      return;
    }

    setCards(sessionProgress.cards);
    setCurrentIndex(sessionProgress.currentIndex || 0);
    setProgress({
      ...sessionProgress,
      stats: {
        correct: sessionProgress.stats.correct || 0,
        incorrect: sessionProgress.stats.incorrect || 0,
        streak: sessionProgress.stats.streak || 0,
        cardsReviewed: sessionProgress.stats.cardsReviewed || 0
      }
    });
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
        {showAnswer ? t('study.controls.hideAnswer') : t('study.controls.showAnswer')}
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

  if (hasExistingSession && !cards.length) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {t('study.resume.title')}
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={handleStartNewSession}>
              {t('study.resume.newSession')}
            </Button>
            <Button variant="contained" onClick={handleResumeSession}>
              {t('study.resume.continueSession')}
            </Button>
          </Box>
        </Paper>
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
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, minHeight: '100vh' }}>
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
          <StudyProgress 
            progress={progress} 
            total={cards.length} 
            onSaveExit={() => handleSaveExit({
              currentIndex,
              stats: progress.stats,
              cards,
              sessionStart: progress.sessionStart
            })} 
          />
          <StudyModeSelector 
            mode={studyMode} 
            onModeChange={setStudyMode} 
            modes={[
              { value: 'flashcard', label: t('study.modes.flashcard') },
              { value: 'multipleChoice', label: t('study.modes.multipleChoice') },
              { value: 'matching', label: t('study.modes.matching') },
              { value: 'fillInBlanks', label: t('study.modes.fillBlanks') }
            ]}
          />
          <Typography 
            variant="body2" 
            sx={{ textAlign: 'center', color: 'text.secondary' }}
          >
            {t('study.progress.cardProgress', {
              values: {
                current: currentIndex + 1,
                total: cards.length
              }
            })}
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
