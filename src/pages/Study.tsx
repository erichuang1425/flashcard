import React, { useEffect, useState, useRef } from 'react';
import { Container, Typography, Box, Button, Paper, Alert, AlertTitle, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserFlashcards, updateCardReview, saveStudyProgress, loadStudyProgress, clearStudyProgress, getFlashcardMetadata, batchGetFlashcards, getFillInBlanksPreference, updateFlashcard } from '../services/firestore';
import FlashCard from '../components/FlashCard';
import { StudyProgress } from '../components/StudyProgress';
import { StudyFeedback } from '../components/StudyFeedback';
import { calculateNextReview, DEFAULT_CONFIG, ReviewResult } from '../utils/spaced-repetition';
import type { Flashcard, StudyProgress as StudyProgressType, FlashcardMetadata } from '../types';
import { StudyModeSelector } from '../components/study-modes/StudyModeSelector';
import type { StudyMode } from '../types';
import { FillInBlanks } from '../components/study-modes/FillInBlanks';
import { MatchingGame } from '../components/study-modes/MatchingGame';
import { MultipleChoice } from '../components/study-modes/MultipleChoice';
import { updateUserXP } from '../services/gamification';
import { useI18n } from '../i18n/I18nContext';
import type { FlashcardsResponse } from '../types/responses';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { auth, db } from '../services/firebase';
import { setDoc, doc, collection, getDocs, getDoc } from '@firebase/firestore';
import { CategorySelector } from '../components/CategorySelector';

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
      cardsReviewed: 0,
      timeSpent: 0
    },
    mode: 'flashcard',
    cards: [],
    sessionStart: new Date()
  });
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcard');
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const { preferences } = useUserPreferences();
  const [sessionProgress, setSessionProgress] = useState<StudyProgressType | null>(null);
  const [hasExistingSession, setHasExistingSession] = useState(false);

  const studyStartTime = React.useRef(Date.now());
  const cardAnswered = React.useRef(false);

  const [metadata, setMetadata] = useState<FlashcardMetadata[]>([]);
  const preloadQueue = useRef<string[]>([]);
  const cardCache = useRef<Map<string, Flashcard>>(new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [currentCards, setCurrentCards] = useState<Flashcard[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [totalFilteredCards, setTotalFilteredCards] = useState<number>(0);
  const [fillBlanksPreference, setFillBlanksPreference] = useState(false);
  
  useEffect(() => {
    const loadPreference = async () => {
      if (auth.currentUser) {
        const pref = await getFillInBlanksPreference(auth.currentUser.uid);
        setFillBlanksPreference(pref);
      }
    };
    loadPreference();
  }, []);

  const handleFillBlanksPreferenceChange = (newPreference: boolean) => {
    setFillBlanksPreference(newPreference);
    cardAnswered.current = false;
    setCurrentIndex(prev => prev);
  };

  useEffect(() => {
    cardAnswered.current = false;
  }, [currentIndex, studyMode]);

  const loadCards = async () => {
    if (user) {
      try {
        setIsLoading(true);
        const flashcardsRef = collection(db, 'users', user.uid, 'flashcards');
        const snapshot = await getDocs(flashcardsRef);
        
        const userSettings = await getDoc(doc(db, 'users', user.uid, 'preferences', 'settings'));
        const srsType = userSettings.data()?.studySettings?.srsType || 'position';
        const newCardsPerDay = userSettings.data()?.studySettings?.defaultNewCardsPerDay || 20;
        const reviewsPerDay = userSettings.data()?.studySettings?.defaultReviewsPerDay || 100;

        const now = new Date();
        const flashcardMeta = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            nextReview: doc.data().nextReview?.toDate() || now,
            state: doc.data().state as 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN',
            position: doc.data().position as number | undefined,
            word: doc.data().word || '',
            categories: doc.data().categories || [],
            difficulty: doc.data().difficulty || 0
          }))
          .filter(card => {
            if (card.state === 'NEW') {
              return true;
            }
            return card.nextReview <= now;
          })
          .sort((a, b) => {
            if (a.state === 'RELEARN' && b.state !== 'RELEARN') return -1;
            if (b.state === 'RELEARN' && a.state !== 'RELEARN') return 1;
            if (a.state === 'NEW' && b.state !== 'NEW') return -1;
            if (b.state === 'NEW' && a.state !== 'NEW') return 1;
            return srsType === 'interval' 
              ? a.nextReview.getTime() - b.nextReview.getTime()
              : (a.position || 0) - (b.position || 0);
          });

        const newCards = flashcardMeta.filter(card => card.state === 'NEW').slice(0, newCardsPerDay);
        const reviewCards = flashcardMeta.filter(card => card.state !== 'NEW').slice(0, reviewsPerDay);
        
        const todaysCards = [...newCards, ...reviewCards];

        flashcardMeta.sort((a, b) => {
          if (a.state === 'RELEARN' && b.state !== 'RELEARN') return -1;
          if (b.state === 'RELEARN' && a.state !== 'RELEARN') return 1;
          if (a.state === 'NEW' && b.state !== 'NEW') return -1;
          if (b.state === 'NEW' && a.state !== 'NEW') return 1;
          return (a.position || 0) - (b.position || 0);
        });

        setMetadata(flashcardMeta);
        setTotalFilteredCards(flashcardMeta.length);
        
        cardCache.current.clear();
        preloadQueue.current = [];
        
        if (flashcardMeta.length === 0) {
          setCards([]);
          setIsLoading(false);
          return;
        }

        const INITIAL_BATCH = studyMode === 'matching' ? 12 : 5;
        const firstBatchIds = flashcardMeta.slice(0, INITIAL_BATCH).map(m => m.id);
        const firstBatch = await batchGetFlashcards(user.uid, firstBatchIds);
        
        preloadQueue.current = flashcardMeta
          .slice(INITIAL_BATCH)
          .map(m => m.id);
        
        firstBatch.forEach(card => cardCache.current.set(card.id, card));
        setCards(firstBatch);
        setCurrentIndex(0);
        setError(null);
      } catch (err) {
        console.error('Error loading cards:', err);
        setError('Failed to load flashcards. Please checkk your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadCards();
  }, [user, preferences.studyVocabLimit, selectedCategory]);

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

  useEffect(() => {
    loadCards();
  }, [studyMode]);

  useEffect(() => {
    setProgress(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        totalCards: totalFilteredCards
      }
    }));
  }, [totalFilteredCards]);

  const checkAndLoadNextCard = async () => {
    if (cardAnswered.current) {
      try {
        setIsLoading(true);
        if (currentIndex < cards.length - 1) {
          cardAnswered.current = false;
          setCurrentIndex(prev => prev + 1);
        } else if (preloadQueue.current.length > 0) {
          const newCards = await preloadNextBatch();
          if (newCards && newCards.length) {
            cardAnswered.current = false;
            setCurrentIndex(prev => prev + 1);
          } else {
            setIsComplete(true);
          }
        } else {
          setIsComplete(true);
        }
      } catch (error) {
        console.error('Error advancing to next card:', error);
        setError('Failed to load next card');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const preloadNextBatch = async () => {
    if (!user || preloadQueue.current.length === 0) return;
    
    const BATCH_SIZE = studyMode === 'matching' ? 12 : 10;
    const idsToLoad = preloadQueue.current.slice(0, BATCH_SIZE);
    
    const newCards = await batchGetFlashcards(user.uid, idsToLoad);
    newCards.forEach(card => {
      if (!cardCache.current.has(card.id)) {
        cardCache.current.set(card.id, card);
      }
    });
    preloadQueue.current = preloadQueue.current.slice(BATCH_SIZE);
    
    setCards(prev => [...prev, ...newCards]);
    return newCards;
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (!user || currentIndex >= cards.length || cardAnswered.current) return;

    const currentCard = cards[currentIndex];
    const rating = isCorrect ? 4 : 1;
    
    const userSettings = await getDoc(doc(db, 'users', user.uid, 'preferences', 'settings'));
    const srsType = userSettings.data()?.studySettings?.srsType || 'position';

    const srsResult = calculateNextReview(
      rating,
      currentCard.difficulty,
      currentCard.state || 'NEW',
      srsType === 'position' ? currentCard.position || 0 : currentCard.interval || 0,
      currentCard.easeFactor || DEFAULT_CONFIG.startingEase
    );

    const cardToReposition = {
      ...currentCard,
      [srsType === 'position' ? 'position' : 'interval']: srsResult.interval,
      state: srsResult.state as 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARN',
      easeFactor: srsResult.easeFactor
    };

    const newCards = cards.filter(c => c.id !== currentCard.id);

    const insertIndex = srsType === 'position' 
  ? Math.min(
      calculateRelativePosition(
        newCards.length,
        srsResult.interval,
        rating,
        cardToReposition.state
      ),
      newCards.length
    )
  : Math.min(currentIndex + 6, newCards.length);

    newCards.splice(insertIndex, 0, cardToReposition);
    setCards(newCards);
    cardAnswered.current = true;
    const xpGained = isCorrect ? 8 : 3;
    await saveStudyProgress(user.uid, {
      cardId: currentCard.id,
      ...srsResult,
      rating: rating,
      isCorrect: rating >= 3,
      mode: studyMode,
      timeSpent: Date.now() - studyStartTime.current
    });
    await updateUserXP(user.uid, xpGained);
    await checkAndLoadNextCard();
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4 | 5, srsResult: ReviewResult) => {
    if (!user || currentIndex >= cards.length) return;
    
    try {
      const currentCard = cards[currentIndex];
      const xpGained = rating >= 4 ? 10 : rating >= 3 ? 5 : 2;

      setProgress(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          correct: prev.stats.correct + (rating >= 3 ? 1 : 0),
          incorrect: prev.stats.incorrect + (rating < 3 ? 1 : 0),
          streak: rating >= 3 ? prev.stats.streak + 1 : 0,
          cardsReviewed: prev.stats.cardsReviewed + 1
        }
      }));

      await Promise.all([
        saveStudyProgress(user.uid, {
          cardId: currentCard.id,
          rating,
          isCorrect: rating >= 3,
          mode: studyMode,
          timeSpent: Date.now() - studyStartTime.current,
          interval: srsResult.interval,
          easeFactor: srsResult.easeFactor,
          nextReview: srsResult.nextReview
        }),
        updateUserXP(user.uid, xpGained),
        updateFlashcard(user.uid, currentCard.id, {
          state: srsResult.state,
          interval: srsResult.interval,
          easeFactor: srsResult.easeFactor,
          nextReview: srsResult.nextReview
        })
      ]);

      cardAnswered.current = true;

      const hasMoreCards = currentIndex < cards.length - 1 || preloadQueue.current.length > 0;
      if (hasMoreCards) {
        await checkAndLoadNextCard();
      } else {
        setIsComplete(true);
      }

    } catch (err) {
      console.error('Error saving progress:', err);
      setError('Failed to save progress');
      cardAnswered.current = false;
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
        cardsReviewed: sessionProgress.stats.cardsReviewed || 0,
        timeSpent: sessionProgress.stats.timeSpent || 0
      },
      mode: sessionProgress.mode || 'flashcard'
    });
  };

  const handleModeChange = (newMode: StudyMode) => {
    if (validModes.includes(newMode as typeof validModes[number])) {
      setStudyMode(newMode);
      cardAnswered.current = false;
      setCurrentIndex(currentIndex);
      setProgress(prev => ({
        ...prev,
        mode: newMode
      }));
    }
  };

  const renderStudyMode = () => {
    switch (studyMode) {
      case 'flashcard':
        return (
          <FlashCard
            card={cards[currentIndex]}
            onRating={handleRating}
            showAnswer={false}
            isLoading={isLoading}
          />
        );
      case 'multipleChoice':
        return <MultipleChoice card={cards[currentIndex]} onAnswer={handleAnswer} />;
      case 'fillInBlanks':
        return (
          <FillInBlanks 
            card={cards[currentIndex]} 
            onAnswer={handleAnswer}
            useWordAsQuestion={fillBlanksPreference} 
          />
        );
      case 'matching':
        return <MatchingGame cards={cards.slice(currentIndex, currentIndex + 6)} onComplete={handleMatchingComplete} />;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (!user && !isLoading) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [user, isLoading, navigate]);

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
        <Typography variant="h6" sx={{ textAlign: 'center', mt: 2 }}>
          {t('study.noCards', {
            values: { 
              total: totalFilteredCards,
              category: selectedCategory || t('study.allCards')
            }
          })}
        </Typography>
      </Container>
    );
  }

  if (isComplete) {
    return (
      <Container>
        <Typography variant="h6" sx={{ textAlign: 'center', mt: 2 }}>
          {t('study.complete', { 
            values: {
              reviewed: progress.stats.cardsReviewed,
              total: totalFilteredCards
            }
          })}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button onClick={() => window.location.reload()}>
            {t('study.startNew')}
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="xl"
      disableGutters
      sx={{
        py: { xs: 1, sm: 3 },
        px: 0,
        minHeight: '100vh',
        overflow: 'hidden',
        width: '100%',
        '& .MuiGrid-root': {
          maxWidth: '100%'
        }
      }}
    >
      <Box sx={{
        minHeight: {
          xs: 'calc(100vh - 56px)',
          sm: 'calc(100vh - 64px)'
        },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 1, sm: 2 },
        width: '100%',
        px: { xs: 1, sm: 2 }
      }}>
        <Box sx={{
          position: { xs: 'static', md: 'sticky' },
          top: { xs: 0, md: 24 },
          width: { xs: '100%', md: '300px' },
          height: { xs: 'auto', md: 'calc(100vh - 96px)' },
          order: { xs: 2, md: 1 },
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: { xs: 2, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          mb: { xs: 2, md: 0 }
        }}>
          <StudyProgress
            progress={progress}
            total={totalFilteredCards}
          />
          <StudyModeSelector
            mode={studyMode}
            onModeChange={handleModeChange}
            onFillBlanksPreferenceChange={handleFillBlanksPreferenceChange}
            currentFillInBlanksPreference={fillBlanksPreference}
            modes={[
              { value: 'flashcard', label: t('study.modes.flashcard') },
              { value: 'multipleChoice', label: t('study.modes.multipleChoice') },
              { value: 'matching', label: t('study.modes.matching') },
              { value: 'fillInBlanks', label: t('study.modes.fillBlanks') }
            ]}
          />
          <CategorySelector
            categories={Array.from(new Set(metadata.flatMap(card => Array.isArray(card.categories) ? card.categories : []).filter(Boolean)))}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            label={t('study.categories.label')}
            placeholder={t('study.categories.placeholder')}
            allCategoriesLabel={t('study.categories.all')}
            noOptionsText={t('study.categories.noCategories')}
          />
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', color: 'text.secondary' }}
          >
            {t('study.progress.cardProgress', {
              values: {
                current: currentIndex + 1,
                total: totalFilteredCards
              }
            })}
          </Typography>
        </Box>

        <Box sx={{
          flex: 1,
          minHeight: {
            xs: 'calc(100vh - 180px)',
            sm: 'calc(100vh - 200px)'
          },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 1, sm: 2 },
          order: { xs: 1, md: 2 },
          pt: { xs: 1, md: 2 },
          width: '100%',
          overflow: 'hidden'
        }}>
          {renderStudyMode()}
        </Box>
      </Box>
    </Container>
  );
};

const calculateRelativePosition = (
  queueLength: number,
  interval: number,
  rating: number,
  state: string
): number => {
  if (rating <= 2) {
    return Math.min(3, queueLength);
  }
  
  return Math.min(
    Math.floor(queueLength * (interval / 100)),
    queueLength
  );
};
