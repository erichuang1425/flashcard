import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Button, Alert, Snackbar } from '@mui/material';
import { FlashCard } from '../components/FlashCard';
import { GuideTip } from '../components/guide/GuideTip';
import { useLanguage } from '../i18n/LanguageContext';
import { useStudySession } from '../hooks/useStudySession';
import { StudyProgress } from '../components/StudyProgress';
import type { StudyMode } from '../types';
import { StudyModeSelector } from '../components/study-modes/StudyModeSelector';
import { FillInBlanks } from '../components/study-modes/FillInBlanks';
import { MatchingGame } from '../components/study-modes/MatchingGame';
import { MultipleChoice } from '../components/study-modes/MultipleChoice';
import { FillInPuzzle } from '../components/study-modes/FillInPuzzle';
import {
  StudyLoadingScreen,
  StudyErrorScreen,
  StudyEmptyScreen,
  StudyCompleteScreen,
} from './StudyScreens';

const PUZZLE_BATCH_SIZE = 8;
const MATCHING_BATCH_SIZE = 6;

export const Study: React.FC = () => {
  const { t } = useLanguage();
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcard');
  const [showAnswer, setShowAnswer] = useState(false);

  const session = useStudySession(
    studyMode === 'matching' ? MATCHING_BATCH_SIZE : PUZZLE_BATCH_SIZE
  );
  const {
    cards, deck, batch, currentIndex, currentCard, progress,
    submitRating, submitBatch, resetSession,
  } = session;

  // Switching modes, advancing to the next card, or restarting after a
  // completed session would otherwise leave the previous card's answer
  // revealed.
  useEffect(() => {
    setShowAnswer(false);
  }, [studyMode, currentIndex, session.isComplete]);

  const renderStudyMode = () => {
    if (!currentCard) return null;
    switch (studyMode) {
      case 'flashcard':
        return (
          <GuideTip
            id="study.card"
            order={1}
            title={t('guide.studyCard.title')}
            body={t('guide.studyCard.body')}
            placement="bottom"
          >
            <FlashCard
              card={currentCard}
              onRating={
                showAnswer && currentCard.id
                  ? (rating) => submitRating(currentCard.id!, rating)
                  : undefined
              }
              showAnswer={showAnswer}
              onToggleAnswer={() => setShowAnswer((prev) => !prev)}
            />
          </GuideTip>
        );
      case 'multipleChoice':
        return (
          <MultipleChoice
            card={currentCard}
            deck={deck}
            onOutcome={(outcome) => submitRating(outcome.cardId, outcome.quality)}
          />
        );
      case 'fillInBlanks':
        return (
          <FillInBlanks
            card={currentCard}
            onOutcome={(outcome) => submitRating(outcome.cardId, outcome.quality)}
          />
        );
      case 'matching':
        return (
          <MatchingGame key={`matching-${currentIndex}`} cards={batch} onComplete={submitBatch} />
        );
      case 'fillInPuzzle':
        return (
          <FillInPuzzle key={`puzzle-${currentIndex}`} cards={batch} onComplete={submitBatch} />
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
        {showAnswer ? t('study.showWord') : t('study.showAnswer')}
      </Button>
    );
  };

  if (session.loading) return <StudyLoadingScreen />;
  if (session.error) return <StudyErrorScreen error={session.error} onRetry={resetSession} />;
  if (!cards.length) return <StudyEmptyScreen />;
  if (session.isComplete) return <StudyCompleteScreen progress={progress} onRestart={resetSession} />;

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
            {t('study.cardOf', { current: currentIndex + 1, total: cards.length })}
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

      <Snackbar
        open={session.saveWarning}
        autoHideDuration={6000}
        onClose={session.dismissSaveWarning}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={session.dismissSaveWarning}>
          {t('study.saveFailed')}
        </Alert>
      </Snackbar>
    </Container>
  );
};
