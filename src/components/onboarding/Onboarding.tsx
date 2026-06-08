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
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import SchoolIcon from '@mui/icons-material/School';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExploreIcon from '@mui/icons-material/Explore';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLanguage } from '../../i18n/LanguageContext';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, Language } from '../../i18n/translations';
import { useOnboarding } from '../../context/OnboardingContext';
import { inset } from '../../utils/safe-area';
import { dvhMinHeight } from '../../utils/viewport';

// Each guide step pairs a large, friendly icon with a translated title/body.
const STEPS: { icon: React.ReactNode; titleKey: string; bodyKey: string }[] = [
  { icon: <WavingHandIcon />, titleKey: 'onboarding.welcome.title', bodyKey: 'onboarding.welcome.body' },
  { icon: <StyleIcon />, titleKey: 'onboarding.flashcards.title', bodyKey: 'onboarding.flashcards.body' },
  { icon: <LibraryAddIcon />, titleKey: 'onboarding.add.title', bodyKey: 'onboarding.add.body' },
  { icon: <SchoolIcon />, titleKey: 'onboarding.study.title', bodyKey: 'onboarding.study.body' },
  { icon: <VolumeUpIcon />, titleKey: 'onboarding.pronounce.title', bodyKey: 'onboarding.pronounce.body' },
  { icon: <TrendingUpIcon />, titleKey: 'onboarding.progress.title', bodyKey: 'onboarding.progress.body' },
  { icon: <ExploreIcon />, titleKey: 'onboarding.navigate.title', bodyKey: 'onboarding.navigate.body' },
  { icon: <CelebrationIcon />, titleKey: 'onboarding.done.title', bodyKey: 'onboarding.done.body' },
];

export const Onboarding: React.FC = () => {
  const theme = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { completeOnboarding } = useOnboarding();
  // 'language' picker first, then the step-by-step guide.
  const [phase, setPhase] = useState<'language' | 'guide'>('language');
  const [chosen, setChosen] = useState<Language>(language);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
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
        {isLast ? (
          <Button
            size="large"
            variant="contained"
            onClick={finish}
            disabled={saving}
            sx={{ py: 1.5, px: 4, fontSize: '1.05rem' }}
          >
            {t('onboarding.finish')}
          </Button>
        ) : (
          <Button
            size="large"
            variant="contained"
            onClick={() => setStepIndex((i) => i + 1)}
            sx={{ py: 1.5, px: 4, fontSize: '1.05rem' }}
          >
            {t('onboarding.next')}
          </Button>
        )}
      </Stack>

      {!isLast && (
        <Button
          onClick={finish}
          disabled={saving}
          sx={{ mt: 2, color: 'text.secondary' }}
        >
          {t('onboarding.skip')}
        </Button>
      )}
    </>
  );
};
