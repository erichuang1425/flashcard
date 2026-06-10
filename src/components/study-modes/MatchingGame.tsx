import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import type { Flashcard } from '../../types';
import { shuffle } from '../../utils/helpers';
import { isMatchingPair } from './logic';
import type { BatchResult } from './types';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  cards: Flashcard[];
  onComplete: (results: BatchResult[]) => void;
}

type Side = 'word' | 'definition';

interface Selection {
  cardId: string;
  side: Side;
}

export const MatchingGame: React.FC<Props> = ({ cards, onComplete }) => {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Selection | null>(null);
  // Track matches by card id rather than by the displayed text, so cards that
  // happen to share a word or definition can't collide.
  const [matched, setMatched] = useState<Set<string>>(new Set());

  const wordItems = useMemo(() => shuffle(cards.map(c => ({ id: c.id, text: c.word }))), [cards]);
  const definitionItems = useMemo(
    () => shuffle(cards.map(c => ({ id: c.id, text: c.englishDefinition }))),
    [cards]
  );

  // Reset selection if the batch of cards changes underneath us.
  useEffect(() => {
    setSelected(null);
    setMatched(new Set());
  }, [cards]);

  const handleSelect = (cardId: string, side: Side) => {
    if (matched.has(cardId)) return;

    if (!selected) {
      setSelected({ cardId, side });
      return;
    }

    // Clicking the same item again clears the selection.
    if (selected.cardId === cardId && selected.side === side) {
      setSelected(null);
      return;
    }

    const isPair = isMatchingPair(selected, cardId, side);

    if (isPair) {
      const newMatched = new Set(matched);
      newMatched.add(cardId);
      setMatched(newMatched);

      // Check completion against the freshly computed set — reading `matched`
      // here would be stale because React batches state updates.
      if (newMatched.size === cards.length) {
        onComplete(cards.map(c => ({ id: c.id, correct: true })));
      }
    }
    setSelected(null);
  };

  const isSelected = (cardId: string, side: Side) =>
    selected?.cardId === cardId && selected?.side === side;

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', maxWidth: 800 }}>
      <Typography variant="h6" gutterBottom align="center">
        {t('study.matching.title')}
      </Typography>
      {/* Stack the two groups vertically on phones so the (often long)
          definitions get the full width to read and the tap targets stay
          large; place them side-by-side from `sm` up. The two lists are
          independently shuffled, so they're grouped — not paired row-by-row. */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 2 },
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5 }}
          >
            {t('study.matching.words')}
          </Typography>
          {wordItems.map((item) => (
            <Button
              key={`word-${item.id}`}
              fullWidth
              variant={isSelected(item.id, 'word') ? 'contained' : 'outlined'}
              disabled={matched.has(item.id)}
              aria-pressed={isSelected(item.id, 'word')}
              aria-label={t('study.matching.wordAria', {
                text: item.text,
                status: matched.has(item.id) ? t('study.matching.matchedStatus') : '',
              })}
              onClick={() => handleSelect(item.id, 'word')}
              sx={{ mb: 1, textTransform: 'none', minHeight: 48 }}
            >
              {item.text}
            </Button>
          ))}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5 }}
          >
            {t('study.matching.definitions')}
          </Typography>
          {definitionItems.map((item) => (
            <Button
              key={`def-${item.id}`}
              fullWidth
              variant={isSelected(item.id, 'definition') ? 'contained' : 'outlined'}
              disabled={matched.has(item.id)}
              aria-pressed={isSelected(item.id, 'definition')}
              aria-label={t('study.matching.definitionAria', {
                text: item.text,
                status: matched.has(item.id) ? t('study.matching.matchedStatus') : '',
              })}
              onClick={() => handleSelect(item.id, 'definition')}
              sx={{ mb: 1, textTransform: 'none', minHeight: 48 }}
            >
              {item.text}
            </Button>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};
