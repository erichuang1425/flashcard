import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import StyleIcon from '@mui/icons-material/Style';
import ExploreIcon from '@mui/icons-material/Explore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { useLanguage } from '../../i18n/LanguageContext';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, Language } from '../../i18n/translations';
import { useOnboarding } from '../../context/OnboardingContext';
import { useGuide } from '../../context/GuideContext';
import { inset } from '../../utils/safe-area';
import { dvhMinHeight } from '../../utils/viewport';

// A short, three-beat welcome. Rather than front-loading every feature for the
// user to memorise, it sets expectations and hands off to the in-app coach
// marks that explain each section in place, when the user actually gets there.
const STEPS: { icon: React.ReactNode; titleKey: string; bodyKey: string }[] = [
  { icon: <WavingHandIcon />, titleKey: 'onboarding.welcome.title', bodyKey: 'onboarding.welcome.body' },
  { icon: <StyleIcon />, titleKey: 'onboarding.flashcards.title', bodyKey: 'onboarding.flashcards.body' },
  { icon: <ExploreIcon />, titleKey: 'onboarding.learnAsYouGo.title', bodyKey: 'onboarding.learnAsYouGo.body' },
];

export const Onboarding: React.FC = () => {
  const theme = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { completeOnboarding } = useOnboarding();
  const { setTipsEnabled, resetTips } = useGuide();
  // 'language' picker first, then the short welcome.
  const [phase, setPhase] = useState<'language' | 'guide'>('language');
  const [chosen, setChosen] = useState<Language>(language);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // `withTips` decides how the user wants to be helped from here on: either the
  // contextual coach marks light up as they explore, or the app stays quiet and
  // they discover it themselves. Either way the upfront guide is done.
  const finish = async (withTips: boolean) => {
    setSaving(true);
    if (withTips) {
      // Start the contextual guidance fresh so every section gets its tip.
      resetTips();
    } else {
      setTipsEnabled(false);
    }
    try {
      await completeOnboarding(chosen);
    } catch {
      // Even if saving the preference fails, let the user into the app rather
      // than trapping them on the guide; the context falls back gracefully.
      setSaving(false);
    }
  };

  // Full-screen, distraction-free shell so first-time users aren't surrounded
  // by chrome they don't yet understand. Plain render helpers (not nested
  // components) so React keeps the subtree mounted across step changes.
  const renderShell = (children: React.ReactNode) => (
    <Box
      sx={{
        ...dvhMinHeight(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Rendered outside Layout (no AppBar chrome), so inset the padding for
        // the safe area or the bottom continue/language buttons land under the
        // home indicator on tall iPhones. `p: 2` (16px) base + insets.
        pt: inset('top', 16),
        pb: inset('bottom', 16),
        pl: inset('left', 16),
        pr: inset('right', 16),
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(160deg, #14171c 0%, #1f2630 100%)'
            : 'linear-gradient(160deg, #eef2ff 0%, #f6f8ff 100%)',
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: '100%',
          maxWidth: 520,
          p: { xs: 3, sm: 5 },
          borderRadius: 4,
          textAlign: 'center',
        }}
      >
        {children}
      </Paper>
    </Box>
  );

  const bigIcon = (icon: React.ReactNode) => (
    <Box
      sx={{
        width: 96,
        height: 96,
        mx: 'auto',
        mb: 3,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        '& .MuiSvgIcon-root': { fontSize: 48 },
      }}
    >
      {icon}
    </Box>
  );

  // --- Phase 1: language selection -----------------------------------------
  if (phase === 'language') {
    return renderShell(
      <>
        {bigIcon(<TranslateIcon />)}
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t('onboarding.chooseLanguage.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t('onboarding.chooseLanguage.subtitle')}
        </Typography>

        <Stack spacing={2}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const selected = chosen === lang;
            return (
              <Button
                key={lang}
                fullWidth
                size="large"
                variant={selected ? 'contained' : 'outlined'}
                onClick={() => {
                  setChosen(lang);
                  // Switch the live UI immediately so the picker's own
                  // "Continue" button and the guide render in the new language.
                  setLanguage(lang);
                }}
                startIcon={selected ? <CheckCircleIcon /> : undefined}
                sx={{ py: 1.75, fontSize: '1.25rem', justifyContent: 'center' }}
              >
                {LANGUAGE_NAMES[lang]}
              </Button>
            );
          })}
        </Stack>

        <Button
          fullWidth
          size="large"
          variant="contained"
          color="primary"
          onClick={() => setPhase('guide')}
          sx={{ mt: 4, py: 1.75, fontSize: '1.15rem' }}
        >
          {t('onboarding.langContinue')}
        </Button>
      </>
    );
  }

  // --- Phase 2: step-by-step guide -----------------------------------------
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  return renderShell(
    <>
      {bigIcon(step.icon)}

      <Typography variant="overline" color="primary" sx={{ letterSpacing: 1 }}>
        {t('onboarding.stepOf', { current: stepIndex + 1, total: STEPS.length })}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, mb: 2 }}>
        {t(step.titleKey)}
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ fontSize: '1.1rem', lineHeight: 1.7, mb: 4 }}
      >
        {t(step.bodyKey)}
      </Typography>

      {/* Progress dots so beginners can see where they are in the tour. */}
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 4 }}>
        {STEPS.map((_, i) => (
          <Box
            key={i}
            sx={{
              width: i === stepIndex ? 24 : 10,
              height: 10,
              borderRadius: 5,
              transition: 'all 0.2s ease',
              bgcolor: i === stepIndex ? 'primary.main' : 'action.disabled',
            }}
          />
        ))}
      </Stack>

      {isLast ? (
        // The final beat is a choice, not just a "Done": guided tips as you go,
        // or a quiet app you explore on your own.
        <Stack spacing={1.5} alignItems="center">
          <Button
            fullWidth
            size="large"
            variant="contained"
            startIcon={<TipsAndUpdatesIcon />}
            onClick={() => finish(true)}
            disabled={saving}
            sx={{ py: 1.5, fontSize: '1.05rem', maxWidth: 360 }}
          >
            {t('onboarding.finishWithTips')}
          </Button>
          <Button
            fullWidth
            size="large"
            variant="text"
            onClick={() => finish(false)}
            disabled={saving}
            sx={{ py: 1.25, fontSize: '1rem', color: 'text.secondary', maxWidth: 360 }}
          >
            {t('onboarding.finishExplore')}
          </Button>
          {!isFirst && (
            <Button
              onClick={() => setStepIndex((i) => i - 1)}
              sx={{ color: 'text.secondary' }}
            >
              {t('onboarding.back')}
            </Button>
          )}
        </Stack>
      ) : (
        <>
          <Stack direction="row" spacing={2} justifyContent="center">
            {!isFirst && (
              <Button
                size="large"
                variant="outlined"
                onClick={() => setStepIndex((i) => i - 1)}
                sx={{ py: 1.5, px: 4, fontSize: '1.05rem' }}
              >
                {t('onboarding.back')}
              </Button>
            )}
            <Button
              size="large"
              variant="contained"
              onClick={() => setStepIndex((i) => i + 1)}
              sx={{ py: 1.5, px: 4, fontSize: '1.05rem' }}
            >
              {t('onboarding.next')}
            </Button>
          </Stack>

          <Button
            onClick={() => finish(true)}
            disabled={saving}
            sx={{ mt: 2, color: 'text.secondary' }}
          >
            {t('onboarding.skip')}
          </Button>
        </>
      )}
    </>
  );
};
