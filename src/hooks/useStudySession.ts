import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import {
  getUserFlashcards,
  updateCardReview,
  updateUserStudyStats,
  updateDailyStreak,
} from '../services/firestore';
import { updateUserXP } from '../services/gamification';
import { classifyLoadedStudyCards } from '../pages/studyLoadState';
import { scheduleCardReview } from '../utils/spaced-repetition';
import type { Rating, ReviewSchedule } from '../utils/spaced-repetition';
import { outcomesFromBatchResults, xpForQuality } from '../components/study-modes/logic';
import type { BatchResult } from '../components/study-modes/types';
import type { Flashcard, StudyProgress } from '../types';

/**
 * The study session engine: owns the due-card queue, batch carving, progress
 * state and session totals, and is the single pipeline through which every
 * study mode feeds the spaced-repetition scheduler and the XP system.
 * `Study.tsx` stays layout + mode-renderer selection only.
 */
export interface StudySession {
  loading: boolean;
  /** Translation key for a load failure, or null. */
  error: string | null;
  isComplete: boolean;
  /** The due cards being studied this session. */
  cards: Flashcard[];
  /** The full deck, for modes that need distractors (e.g. Multiple Choice). */
  deck: Flashcard[];
  currentIndex: number;
  currentCard: Flashcard | undefined;
  /** The slice of due cards the current batch mode plays with. */
  batch: Flashcard[];
  progress: StudyProgress;
  /** True when one or more review writes failed and were queued for retry. */
  saveWarning: boolean;
  dismissSaveWarning: () => void;
  /** Grade the current single card. No-op if `cardId` is stale. */
  submitRating: (cardId: string, rating: Rating) => Promise<void>;
  /** Grade a batch mode's per-card results and advance past the batch. */
  submitBatch: (results: BatchResult[]) => Promise<void>;
  resetSession: () => void;
}

interface PendingReview {
  cardId: string;
  schedule: ReviewSchedule;
}

const EMPTY_PROGRESS: StudyProgress = {
  correct: 0,
  incorrect: 0,
  streak: 0,
  cardsReviewed: 0,
};

export const useStudySession = (batchSize: number): StudySession => {
  const { user } = useAuth();
  const { checkAchievements, recordSession } = useGamification();

  const [cards, setCards] = useState<Flashcard[]>([]);
  // Full deck kept around so study modes that need distractors (e.g. Multiple
  // Choice) don't have to refetch every card from Firestore.
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState<StudyProgress>(EMPTY_PROGRESS);
  const [error, setError] = useState<string | null>(null);
  // Start in a loading state so the initial render shows a spinner rather than
  // briefly flashing the "No cards due" empty state before the fetch resolves.
  const [loading, setLoading] = useState(true);
  const [saveWarning, setSaveWarning] = useState(false);

  // Session bookkeeping for the stats written on completion.
  const sessionStart = useRef(Date.now());
  const masteredCount = useRef(0);
  // Reviews whose write failed even after a retry; re-attempted before the
  // session's stats are recorded so a transient outage doesn't lose them.
  const pendingReviews = useRef<PendingReview[]>([]);

  const loadCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const allCards = await getUserFlashcards(user.uid);
      const loaded = classifyLoadedStudyCards(allCards);

      setDeck(allCards);
      setCards(loaded.dueCards);
      setError(loaded.error);
      sessionStart.current = Date.now();
      masteredCount.current = 0;
      pendingReviews.current = [];
      setSaveWarning(false);
    } catch (err) {
      console.error('Error loading cards:', err);
      setCards([]);
      setError('study.loadFailed');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Memoize the batch for the batch modes: a fresh `.slice()` every render
  // would change the `cards` prop identity on unrelated re-renders (e.g. the
  // XP snapshot listener), reshuffling the game and wiping matches mid-play.
  const batch = useMemo(
    () => cards.slice(currentIndex, currentIndex + batchSize),
    [cards, currentIndex, batchSize]
  );

  /**
   * Write one review, retrying once; if both attempts fail, queue it for a
   * later retry and surface a non-blocking warning instead of stranding the
   * session.
   */
  const persistReview = useCallback(
    async (cardId: string, schedule: ReviewSchedule) => {
      if (!user) return;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await updateCardReview(user.uid, cardId, schedule);
          return;
        } catch (err) {
          if (attempt === 1) {
            console.error('Error saving card review:', err);
            pendingReviews.current.push({ cardId, schedule });
            setSaveWarning(true);
          }
        }
      }
    },
    [user]
  );

  const flushPendingReviews = useCallback(async () => {
    if (!user || pendingReviews.current.length === 0) return;
    const pending = pendingReviews.current;
    pendingReviews.current = [];
    for (const review of pending) {
      try {
        await updateCardReview(user.uid, review.cardId, review.schedule);
      } catch (err) {
        // Out of retries — the card simply comes due again next session.
        console.error('Error saving queued card review:', err);
      }
    }
  }, [user]);

  const awardXP = useCallback(
    async (amount: number) => {
      if (!user || amount <= 0) return;
      try {
        await updateUserXP(user.uid, amount);
      } catch (err) {
        // XP is best-effort; never block the session on it.
        console.error('Error awarding XP:', err);
      }
    },
    [user]
  );

  // Persist the finished session: queued reviews, study stats (sessions,
  // minutes, accuracy), the daily streak, and a re-check of achievement
  // progress. Totals are passed in explicitly because the `progress` state
  // update for the final card hasn't flushed yet when the session completes.
  const finishSession = useCallback(
    async (sessionCorrect: number, sessionReviewed: number) => {
      setIsComplete(true);
      if (!user || sessionReviewed === 0) return;

      await flushPendingReviews();
      const durationSeconds = Math.max(0, Math.round((Date.now() - sessionStart.current) / 1000));
      const accuracy = Math.round((sessionCorrect / sessionReviewed) * 100);

      // Stats + streak, achievements, and daily challenges are three independent
      // best-effort follow-ups, each only triggered by this session-complete
      // event. They get their own try/catch so a failure in one (e.g. a transient
      // achievements read) can't skip the others — in particular it must not drop
      // this session's challenge progress and reward.
      try {
        await updateUserStudyStats(user.uid, {
          duration: durationSeconds,
          cardsStudied: sessionReviewed,
          accuracy,
          masteredCards: masteredCount.current,
        });
        await updateDailyStreak(user.uid);
      } catch (err) {
        // The session itself succeeded; stats are best-effort.
        console.error('Error recording study session:', err);
      }
      try {
        await checkAchievements();
      } catch (err) {
        console.error('Error checking achievements:', err);
      }
      try {
        await recordSession({
          cardsReviewed: sessionReviewed,
          accuracy,
          studyMinutes: Math.round(durationSeconds / 60),
        });
      } catch (err) {
        console.error('Error recording challenge progress:', err);
      }
    },
    [user, flushPendingReviews, checkAchievements, recordSession]
  );

  const submitRating = useCallback(
    async (cardId: string, rating: Rating) => {
      if (!user || currentIndex >= cards.length) return;

      const card = cards[currentIndex];
      // A stale outcome (e.g. a mode's pending timer firing after the session
      // advanced) must not be applied to a different card.
      if (!card.id || card.id !== cardId) return;

      const schedule = scheduleCardReview(card, rating);
      await Promise.all([
        persistReview(card.id, schedule),
        awardXP(xpForQuality(rating)),
      ]);

      if (rating >= 4) masteredCount.current += 1;

      const correct = rating >= 3;
      setProgress((prev) => ({
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1),
        streak: correct ? prev.streak + 1 : 0,
        cardsReviewed: prev.cardsReviewed + 1,
      }));

      if (currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        await finishSession(
          progress.correct + (correct ? 1 : 0),
          progress.cardsReviewed + 1
        );
      }
    },
    [user, cards, currentIndex, progress, persistReview, awardXP, finishSession]
  );

  // Each reviewed card is run through the spaced-repetition scheduler
  // individually so batch modes affect scheduling per card, not
  // all-or-nothing. The session advances by the batch length, which can
  // exceed the number of scored cards when a batch contains cards the mode
  // couldn't use.
  const submitBatch = useCallback(
    async (results: BatchResult[]) => {
      if (!user) return;

      const writes: Promise<void>[] = [];
      let correct = 0;
      let xp = 0;
      for (const outcome of outcomesFromBatchResults(results)) {
        const card = cards.find((c) => c.id === outcome.cardId);
        if (!card?.id) continue;
        const schedule = scheduleCardReview(card, outcome.quality);
        writes.push(persistReview(card.id, schedule));
        xp += xpForQuality(outcome.quality);
        if (outcome.quality >= 4) masteredCount.current += 1;
        if (outcome.quality >= 3) correct++;
      }

      await Promise.all([...writes, awardXP(xp)]);

      setProgress((prev) => ({
        correct: prev.correct + correct,
        incorrect: prev.incorrect + (results.length - correct),
        streak: results.length > 0 && correct === results.length ? prev.streak + 1 : 0,
        cardsReviewed: prev.cardsReviewed + results.length,
      }));

      if (currentIndex + batch.length >= cards.length) {
        await finishSession(
          progress.correct + correct,
          progress.cardsReviewed + results.length
        );
      } else {
        setCurrentIndex((prev) => prev + batch.length);
      }
    },
    [user, cards, currentIndex, batch, progress, persistReview, awardXP, finishSession]
  );

  const resetSession = useCallback(() => {
    setCurrentIndex(0);
    setIsComplete(false);
    setProgress(EMPTY_PROGRESS);
    loadCards();
  }, [loadCards]);

  const dismissSaveWarning = useCallback(() => setSaveWarning(false), []);

  return {
    loading,
    error,
    isComplete,
    cards,
    deck,
    currentIndex,
    currentCard: cards[currentIndex],
    batch,
    progress,
    saveWarning,
    dismissSaveWarning,
    submitRating,
    submitBatch,
    resetSession,
  };
};
