import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card, Typography, Box, Button, Tooltip, useMediaQuery, Theme } from '@mui/material';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { Flashcard } from '../types';
import { capitalizeFirstWord } from '../utils/helpers';
import { PronunciationButton } from './PronunciationButton';
import { usePronunciation } from '../context/PronunciationContext';
import { useLanguage } from '../i18n/LanguageContext';

interface FlashCardProps {
  card: Flashcard;
  onRating?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  showAnswer?: boolean;
  /**
   * Called when the user taps/clicks the card (or presses Space/Enter) to flip
   * it. When provided, the card itself becomes the primary way to reveal the
   * answer — no separate button required.
   */
  onToggleAnswer?: () => void;
}

const ratings: { value: 1 | 2 | 3 | 4 | 5; emoji: string; labelKey: string }[] = [
  { value: 1, emoji: '😟', labelKey: 'flashcard.rating.again' },
  { value: 2, emoji: '😐', labelKey: 'flashcard.rating.hard' },
  { value: 3, emoji: '🙂', labelKey: 'flashcard.rating.good' },
  { value: 4, emoji: '😊', labelKey: 'flashcard.rating.easy' },
  { value: 5, emoji: '🎯', labelKey: 'flashcard.rating.perfect' },
];

// Shared face styling: each face is absolutely positioned so the front and back
// occupy the same space and the card can rotate between them in 3D.
const faceSx = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  borderRadius: '24px',
  overflow: 'hidden',
} as const;

export const FlashCard: React.FC<FlashCardProps> = ({
  card,
  onRating,
  showAnswer = false,
  onToggleAnswer,
}) => {
  // Read responsive state once at the top — calling hooks inside the rating
  // map (as the previous version did) violates the Rules of Hooks.
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const { autoSpeak, speak, supported } = usePronunciation();
  const { t } = useLanguage();

  // Auto-pronounce each new word when the user has opted in.
  useEffect(() => {
    if (supported && autoSpeak && card.word) {
      speak(card.word);
    }
    // Re-run when the visible word changes; `speak` is stable per settings.
  }, [card.word, autoSpeak, supported, speak]);

  // The two faces are absolutely positioned, so the card has no intrinsic
  // height. Measure both faces and size the card to the taller one — this keeps
  // the iconic flip animation while guaranteeing the answer and rating buttons
  // are never clipped (the bug that drove the earlier non-flip layout).
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const measure = () => {
      const front = frontRef.current?.scrollHeight ?? 0;
      const back = backRef.current?.scrollHeight ?? 0;
      const next = Math.max(front, back);
      if (next > 0) setCardHeight(next);
    };
    measure();

    const observer = new ResizeObserver(measure);
    if (frontRef.current) observer.observe(frontRef.current);
    if (backRef.current) observer.observe(backRef.current);
    return () => observer.disconnect();
  }, [card, isMobile]);

  const canFlip = Boolean(onToggleAnswer);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Buttons inside the card own their keyboard events. Letting Enter/Space
      // bubble into this handler flips the card instead of activating the
      // focused pronunciation or rating control.
      if (e.target !== e.currentTarget) return;

      // Space / Enter flips the card.
      if ((e.key === ' ' || e.key === 'Enter') && canFlip) {
        e.preventDefault();
        onToggleAnswer?.();
        return;
      }
      // Number keys 1–5 rate the card once the answer is showing — power users
      // can rip through a deck without reaching for the mouse.
      if (showAnswer && onRating && /^[1-5]$/.test(e.key)) {
        e.preventDefault();
        onRating(Number(e.key) as 1 | 2 | 3 | 4 | 5);
      }
    },
    [canFlip, onToggleAnswer, showAnswer, onRating]
  );

  // Minimum height keeps the very first paint stable before measurement.
  const minH = isMobile ? 360 : 480;

  const word = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
      <Typography
        variant="h3"
        sx={{
          fontSize: { xs: '2rem', sm: '3.5rem' },
          fontWeight: 700,
          textAlign: 'center',
          // Solid color as the base so the word is never invisible — on some
          // iOS versions the gradient `background-clip: text` paint drops out
          // under compositing, leaving a blank word. Apply the gradient only
          // where supported.
          color: 'primary.main',
          '@supports (-webkit-background-clip: text) or (background-clip: text)': {
            background: (theme) =>
              `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          },
        }}
      >
        {card.word}
      </Typography>
      {/* Stop propagation so tapping the speaker never also flips the card. */}
      <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'inline-flex' }}>
        <PronunciationButton text={card.word} size={isMobile ? 'medium' : 'large'} />
      </Box>
    </Box>
  );

  const surface = (theme: Theme) =>
    theme.palette.mode === 'dark'
      ? 'linear-gradient(145deg, #1a1a1a 0%, #262626 100%)'
      : 'linear-gradient(145deg, #fefefe 0%, #ffffff 100%)';

  return (
    <Box sx={{ width: '100%', perspective: '1600px' }}>
      <Box
        // Accessible, focusable flip control when the card is interactive.
        role={canFlip ? 'button' : undefined}
        tabIndex={canFlip ? 0 : undefined}
        aria-pressed={canFlip ? showAnswer : undefined}
        aria-label={canFlip ? t('flashcard.flipAria', { word: card.word }) : undefined}
        onClick={canFlip ? () => onToggleAnswer?.() : undefined}
        onKeyDown={handleKeyDown}
        sx={{
          position: 'relative',
          width: '100%',
          height: cardHeight ?? minH,
          minHeight: minH,
          transition: 'height 0.2s ease, transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transformStyle: 'preserve-3d',
          transform: showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)',
          cursor: canFlip ? 'pointer' : 'default',
          outline: 'none',
          '&:focus-visible': {
            // The focus ring belongs on the rotating element so it tracks the
            // visible face.
            boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}66`,
            borderRadius: '24px',
          },
        }}
      >
        {/* ---- Front: the word, an invitation to flip ---- */}
        <Card
          ref={frontRef}
          sx={{
            ...faceSx,
            background: surface,
            boxShadow: (theme) => `0 8px 32px ${theme.palette.primary.main}15`,
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, sm: 3 },
          }}
        >
          {word}
          {canFlip && (
            <Box
              sx={{
                mt: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
                opacity: 0.85,
                animation: 'flashcardHint 2s ease-in-out infinite',
                '@keyframes flashcardHint': {
                  '0%, 100%': { transform: 'translateY(0)' },
                  '50%': { transform: 'translateY(4px)' },
                },
              }}
            >
              <TouchAppIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {t('flashcard.tapToReveal')}
              </Typography>
            </Box>
          )}
        </Card>

        {/* ---- Back: meaning, translation and the rating row ---- */}
        <Card
          ref={backRef}
          sx={{
            ...faceSx,
            transform: 'rotateY(180deg)',
            background: surface,
            boxShadow: (theme) => `0 8px 32px ${theme.palette.primary.main}15`,
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: { xs: 2, sm: 3 },
              minHeight: 0,
            }}
          >
            <Box sx={{ mb: 2 }}>{word}</Box>

            <Box sx={{ width: '100%', textAlign: 'center', px: { xs: 1, sm: 0 } }}>
              <Typography variant="h6" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                {card.partOfSpeech}
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                {capitalizeFirstWord(card.englishDefinition)}
              </Typography>

              {card.chineseTranslation && (
                <Typography variant="h5" color="primary" sx={{ mt: 2, fontWeight: 500 }}>
                  {card.chineseTranslation}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Rating buttons. Clicks stop propagation so rating never re-flips. */}
          {onRating && (
            <Box
              onClick={(e) => e.stopPropagation()}
              sx={{
                display: 'grid',
                // Two rows on mobile (3 + 2), a single row on desktop.
                gridTemplateColumns: { xs: 'repeat(6, 1fr)', sm: 'repeat(5, 1fr)' },
                gap: { xs: 1, sm: 1.5 },
                p: { xs: 1.5, sm: 2 },
                width: '100%',
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              {ratings.map(({ value, emoji, labelKey }) => {
                const label = t(labelKey);
                return (
                <Tooltip key={value} title={label} arrow>
                  <Button
                    onClick={() => onRating(value)}
                    variant="contained"
                    // On mobile the button shows only the emoji and the label
                    // lives in a hover-only Tooltip, so without an explicit label
                    // touch users and screen readers get no meaning. Announce it.
                    aria-label={label}
                    color={value >= 4 ? 'success' : value >= 3 ? 'primary' : 'error'}
                    sx={{
                      // On mobile the five buttons share six columns: the first
                      // three take two columns each (top row), the last two take
                      // three columns each (bottom row) for even, tappable tiles.
                      gridColumn: {
                        xs: value <= 3 ? 'span 2' : 'span 3',
                        sm: 'span 1',
                      },
                      minHeight: { xs: '48px', sm: 'auto' },
                      py: { xs: 1, sm: 2 },
                      fontSize: { xs: '1.5rem', sm: '1rem' },
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isMobile ? emoji : `${emoji} ${label}`}
                  </Button>
                </Tooltip>
                );
              })}
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
};
