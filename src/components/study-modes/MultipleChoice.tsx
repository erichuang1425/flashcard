import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import type { Flashcard } from '../../types';
import { capitalizeFirstWord, shuffle } from '../../utils/helpers';

interface Props {
  card: Flashcard;
  /** The full deck, used to draw plausible wrong answers. */
  deck: Flashcard[];
  onAnswer: (correct: boolean) => void;
}

const NUM_OPTIONS = 4;

export const MultipleChoice: React.FC<Props> = ({ card, deck, onAnswer }): JSX.Element => {
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>();

  const correctAnswer = useMemo(
    () => capitalizeFirstWord(card.englishDefinition),
    [card]
  );

  // Build the answer choices from real cards in the deck. Prefer distractors
  // that share the part of speech (harder, more meaningful), then fall back to
  // any other definition. Drawing only from real definitions avoids the old
  // giveaway placeholders like "opposite of ...".
  const options = useMemo(() => {
    const seen = new Set([card.englishDefinition.toLowerCase().trim()]);
    const pickFrom = (cards: Flashcard[]) =>
      cards
        .filter(c => {
          const key = c.englishDefinition?.toLowerCase().trim();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(c => c.englishDefinition);

    const others = deck.filter(c => c.id !== card.id);
    const samePos = others.filter(c => c.partOfSpeech === card.partOfSpeech);

    const distractors = [
      ...shuffle(pickFrom(samePos)),
      ...shuffle(pickFrom(others)),
    ]
      .slice(0, NUM_OPTIONS - 1)
      .map(capitalizeFirstWord);

    return shuffle([correctAnswer, ...distractors]);
  }, [card, deck, correctAnswer]);

  // Reset transient state when the card (and therefore the options) changes.
  // Also clear any pending auto-advance timer so a correct answer on the
  // previous card can't fire onAnswer against the new one (double advance).
  useEffect(() => {
    clearTimeout(advanceTimer.current);
    setSelected(null);
    setShowResult(false);
    setCanProceed(false);
    setIsCorrect(false);
  }, [card]);

  // Clear any pending auto-advance timer when the component unmounts so we
  // don't call onAnswer / setState after the study session has moved on.
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const handleSelect = (option: string) => {
    if (showResult || !option) return;

    setSelected(option);
    setShowResult(true);

    const correct = correctAnswer === option;
    setIsCorrect(correct);

    if (correct) {
      // Move to next question automatically if correct
      advanceTimer.current = setTimeout(() => {
        onAnswer(true);
      }, 1000);
    } else {
      // Show correct answer and wait for user to proceed
      setCanProceed(true);
    }
  };

  const handleProceed = () => {
    onAnswer(false);
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', maxWidth: 600 }}>
      <Typography variant="h4" align="center" gutterBottom>
        {card.word}
      </Typography>
      <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
        {card.partOfSpeech}
      </Typography>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {options.map((option, index) => (
          <Button
            key={`${index}-${option}`}
            variant={selected === option ? 'contained' : 'outlined'}
            onClick={() => handleSelect(option)}
            disabled={showResult}
            color={
              showResult
                ? option === correctAnswer
                  ? 'success'
                  : selected === option
                  ? 'error'
                  : 'primary'
                : 'primary'
            }
            sx={{
              py: 2,
              textAlign: 'left',
              justifyContent: 'flex-start',
              textTransform: 'none',
              minHeight: 56,
            }}
          >
            {option}
          </Button>
        ))}

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
              ? 'Correct'
              : `Incorrect. The correct answer is ${correctAnswer}`}
          </Box>
        )}

        {showResult && !isCorrect && canProceed && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleProceed}
            sx={{ mt: 2, minHeight: 48 }}
          >
            Continue
          </Button>
        )}
      </Box>
    </Paper>
  );
};
