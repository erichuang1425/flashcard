import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box, Button, Typography, Paper, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import type { Flashcard } from '../../types';
import { capitalizeFirstWord } from '../../utils/helpers';
import { buildMultipleChoiceOptions, gradeRecall, MC_FAST_ANSWER_MS } from './logic';
import type { ModeOutcome, MultipleChoiceDirection as Direction } from './logic';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  card: Flashcard;
  /** The full deck, used to draw plausible wrong answers. */
  deck: Flashcard[];
  /** Graded recall result: wrong → lapse, correct → Good, fast → Easy. */
  onOutcome: (outcome: ModeOutcome) => void;
}

/**
 * Question direction:
 * - `wordToMeaning`: prompt shows the word, options are English definitions
 *   (each annotated with its Traditional Chinese translation as a comment).
 * - `meaningToWord`: the reverse — prompt shows the definition + translation,
 *   options are the vocabulary words.
 */

export const MultipleChoice: React.FC<Props> = ({ card, deck, onOutcome }): JSX.Element => {
  const { t } = useLanguage();
  const [direction, setDirection] = useState<Direction>('wordToMeaning');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>();
  // When the question was shown, so a correct answer can be graded on speed.
  const questionStart = useRef(Date.now());

  // Build the answer choices from real cards in the deck. We keep whole
  // Flashcards (not just strings) so each option can render both its main text
  // and its Chinese-translation "comment", and so the reverse direction can
  // offer words instead of definitions. See `buildMultipleChoiceOptions`.
  const options = useMemo(
    () => buildMultipleChoiceOptions(card, deck, direction),
    [card, deck, direction]
  );

  // Reset transient state when the card OR the direction (and therefore the
  // options) changes. Also clear any pending auto-advance timer so a correct
  // answer on the previous card can't fire onOutcome against the new one.
  useEffect(() => {
    clearTimeout(advanceTimer.current);
    setSelectedId(null);
    setShowResult(false);
    setCanProceed(false);
    setIsCorrect(false);
    questionStart.current = Date.now();
  }, [card, direction]);

  // Clear any pending auto-advance timer when the component unmounts so we
  // don't call onOutcome / setState after the study session has moved on.
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // The text shown on an option, plus the muted "comment" line beneath it.
  const optionPrimary = (c: Flashcard) =>
    direction === 'wordToMeaning' ? capitalizeFirstWord(c.englishDefinition) : c.word;
  const optionComment = (c: Flashcard) =>
    direction === 'wordToMeaning' ? c.chineseTranslation : c.partOfSpeech;

  const handleSelect = (option: Flashcard) => {
    if (showResult || !option.id || !card.id) return;

    setSelectedId(option.id);
    setShowResult(true);

    const correct = option.id === card.id;
    setIsCorrect(correct);

    if (correct) {
      // Grade speed at selection time, not when the advance timer fires.
      const quality = gradeRecall(true, Date.now() - questionStart.current, MC_FAST_ANSWER_MS);
      // Move to next question automatically if correct
      advanceTimer.current = setTimeout(() => {
        onOutcome({ cardId: card.id!, quality });
      }, 1000);
    } else {
      // Show correct answer and wait for user to proceed
      setCanProceed(true);
    }
  };

  const handleProceed = () => {
    if (!card.id) return;
    onOutcome({ cardId: card.id, quality: gradeRecall(false, 0, MC_FAST_ANSWER_MS) });
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', maxWidth: 600 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={direction}
          onChange={(_, next: Direction | null) => next && setDirection(next)}
          aria-label={t('study.mc.directionAria')}
        >
          <ToggleButton value="wordToMeaning">{t('study.mc.wordToMeaning')}</ToggleButton>
          <ToggleButton value="meaningToWord">{t('study.mc.meaningToWord')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {direction === 'wordToMeaning' ? (
        <>
          <Typography variant="h4" align="center" gutterBottom>
            {card.word}
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            {card.partOfSpeech}
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="h5" align="center" gutterBottom>
            {capitalizeFirstWord(card.englishDefinition)}
          </Typography>
          {card.chineseTranslation && (
            <Typography
              align="center"
              sx={{
                mb: 3,
                color: 'text.secondary',
                fontStyle: 'italic',
                fontFamily: 'monospace',
              }}
            >
              {`// ${card.chineseTranslation}`}
            </Typography>
          )}
        </>
      )}

      <Box sx={{ display: 'grid', gap: 2 }}>
        {options.map((option, index) => {
          const comment = optionComment(option);
          return (
            <Button
              key={`${index}-${option.id}`}
              variant={selectedId === option.id ? 'contained' : 'outlined'}
              onClick={() => handleSelect(option)}
              disabled={showResult}
              color={
                showResult
                  ? option.id === card.id
                    ? 'success'
                    : selectedId === option.id
                    ? 'error'
                    : 'primary'
                  : 'primary'
              }
              sx={{
                py: 1.5,
                px: 2,
                textAlign: 'left',
                justifyContent: 'flex-start',
                textTransform: 'none',
                minHeight: 56,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                <Typography component="span" sx={{ fontWeight: 500 }}>
                  {optionPrimary(option)}
                </Typography>
                {comment && (
                  <Typography
                    component="span"
                    sx={{
                      mt: 0.25,
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                      fontFamily: 'monospace',
                      opacity: 0.75,
                    }}
                  >
                    {`// ${comment}`}
                  </Typography>
                )}
              </Box>
            </Button>
          );
        })}

        {showResult && (
          <Box
            role="status"
            aria-live="polite"
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
            }}
          >
            {isCorrect
              ? t('study.mc.correct')
              : t('study.mc.incorrectAnswer', { answer: optionPrimary(card) })}
          </Box>
        )}

        {showResult && !isCorrect && canProceed && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleProceed}
            sx={{ mt: 2, minHeight: 48 }}
          >
            {t('study.mc.continue')}
          </Button>
        )}
      </Box>
    </Paper>
  );
};
