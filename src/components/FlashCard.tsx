import React, { useEffect } from 'react';
import { Card, Typography, Box, Button, Tooltip, useMediaQuery, Theme } from '@mui/material';
import { Flashcard } from '../types';
import { capitalizeFirstWord } from '../utils/helpers';
import { PronunciationButton } from './PronunciationButton';
import { usePronunciation } from '../context/PronunciationContext';

interface FlashCardProps {
  card: Flashcard;
  onRating?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  showAnswer?: boolean;
}

const ratings: { value: 1 | 2 | 3 | 4 | 5; emoji: string; label: string }[] = [
  { value: 1, emoji: '😟', label: 'Again' },
  { value: 2, emoji: '😐', label: 'Hard' },
  { value: 3, emoji: '🙂', label: 'Good' },
  { value: 4, emoji: '😊', label: 'Easy' },
  { value: 5, emoji: '🎯', label: 'Perfect' },
];

export const FlashCard: React.FC<FlashCardProps> = ({ card, onRating, showAnswer = false }) => {
  // Read responsive state once at the top — calling hooks inside the rating
  // map (as the previous version did) violates the Rules of Hooks.
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const { autoSpeak, speak, supported } = usePronunciation();

  // Auto-pronounce each new word when the user has opted in.
  useEffect(() => {
    if (supported && autoSpeak && card.word) {
      speak(card.word);
    }
    // Re-run when the visible word changes; `speak` is stable per settings.
  }, [card.word, autoSpeak, supported, speak]);

  return (
    <Box sx={{ width: '100%' }}>
      <Card sx={{
        // Grow with content instead of a fixed height so the answer and rating
        // buttons can never be clipped off the bottom on small screens.
        minHeight: { xs: '360px', sm: '480px' },
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme => theme.palette.mode === 'dark'
          ? 'linear-gradient(145deg, #1a1a1a 0%, #262626 100%)'
          : 'linear-gradient(145deg, #fefefe 0%, #ffffff 100%)',
        boxShadow: theme => `0 8px 32px ${theme.palette.primary.main}15`,
        borderRadius: '24px',
        overflow: 'hidden',
      }}>
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 3 },
        }}>
          {/* Word is always visible, with a tap-to-pronounce speaker button */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
            <Typography
              variant="h3"
              sx={{
                fontSize: { xs: '2rem', sm: '3.5rem' },
                fontWeight: 700,
                textAlign: 'center',
                // Solid color as the base so the word is never invisible — on
                // some iOS versions the gradient `background-clip: text` paint
                // drops out under compositing, and with a transparent fill that
                // leaves a blank word. Apply the gradient only where supported.
                color: 'primary.main',
                '@supports (-webkit-background-clip: text) or (background-clip: text)': {
                  background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                },
              }}
            >
              {card.word}
            </Typography>
            <PronunciationButton text={card.word} size={isMobile ? 'medium' : 'large'} />
          </Box>

          {/* Definitions and translations fade in */}
          <Box sx={{
            width: '100%',
            textAlign: 'center',
            opacity: showAnswer ? 1 : 0,
            transition: 'opacity 0.3s ease',
            visibility: showAnswer ? 'visible' : 'hidden',
            px: { xs: 1, sm: 0 },
          }}>
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

        {/* Rating buttons */}
        {onRating && showAnswer && (
          <Box sx={{
            display: 'grid',
            // Two rows of buttons on mobile (3 + 2), a single row on desktop.
            gridTemplateColumns: { xs: 'repeat(6, 1fr)', sm: 'repeat(5, 1fr)' },
            gap: { xs: 1, sm: 1.5 },
            p: { xs: 1.5, sm: 2 },
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            {ratings.map(({ value, emoji, label }) => (
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
            ))}
          </Box>
        )}
      </Card>
    </Box>
  );
};
