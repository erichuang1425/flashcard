import React from 'react';
import {
  Container, Typography, Box, Button, Paper, Alert, AlertTitle, CircularProgress,
} from '@mui/material';
import { useLanguage } from '../i18n/LanguageContext';
import type { StudyProgress } from '../types';

/**
 * The full-screen loading / error / empty / complete states of the Study
 * page, kept out of `Study.tsx` so it stays layout + mode selection only.
 */

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

export const StudyLoadingScreen: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Container sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      '@supports (min-height: 100dvh)': { minHeight: '50dvh' },
    }}>
      <CircularProgress aria-label={t('study.loading')} />
    </Container>
  );
};

export const StudyErrorScreen: React.FC<{ error: string; onRetry: () => void }> = ({
  error,
  onRetry,
}) => {
  const { t } = useLanguage();
  return (
    <CenteredState>
      <Alert severity="error" sx={{ textAlign: 'left' }}>
        <AlertTitle>{t('common.error')}</AlertTitle>
        {t(error)}
      </Alert>
      <Button variant="contained" onClick={onRetry} sx={{ mt: 3 }}>
        {t('common.tryAgain')}
      </Button>
    </CenteredState>
  );
};

export const StudyEmptyScreen: React.FC = () => {
  const { t } = useLanguage();
  return (
    <CenteredState>
      <Typography variant="h4" gutterBottom>🎉</Typography>
      <Typography variant="h6" gutterBottom>{t('study.emptyTitle')}</Typography>
      <Typography color="text.secondary">
        {t('study.emptyBody')}
      </Typography>
    </CenteredState>
  );
};

export const StudyCompleteScreen: React.FC<{
  progress: StudyProgress;
  onRestart: () => void;
}> = ({ progress, onRestart }) => {
  const { t } = useLanguage();
  const accuracy = progress.cardsReviewed > 0
    ? Math.round((progress.correct / progress.cardsReviewed) * 100)
    : 0;
  return (
    <CenteredState>
      <Typography variant="h4" gutterBottom>🎉</Typography>
      <Typography variant="h5" gutterBottom>{t('study.completeTitle')}</Typography>
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
          <Typography variant="body2" color="text.secondary">{t('study.reviewed')}</Typography>
        </Box>
        <Box>
          <Typography variant="h4" color="success.main">{progress.correct}</Typography>
          <Typography variant="body2" color="text.secondary">{t('study.correct')}</Typography>
        </Box>
        <Box>
          <Typography variant="h4" color="error.main">{progress.incorrect}</Typography>
          <Typography variant="body2" color="text.secondary">{t('study.incorrect')}</Typography>
        </Box>
        <Box>
          <Typography variant="h4">{accuracy}%</Typography>
          <Typography variant="body2" color="text.secondary">{t('study.accuracy')}</Typography>
        </Box>
      </Box>
      <Button variant="contained" onClick={onRestart}>
        {t('study.startNewSession')}
      </Button>
    </CenteredState>
  );
};
