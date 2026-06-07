import React, { useMemo, useState } from 'react';
import { Box, Button, Paper, Typography, Alert, Stack } from '@mui/material';
import type { Flashcard } from '../../types';
import { generateCrossword } from '../../utils/crossword';
import type { CrosswordCell } from '../../utils/crossword';
import type { BatchResult } from './types';

interface Props {
  cards: Flashcard[];
  onComplete: (results: BatchResult[]) => void;
}

const CELL_SIZE = 38;

const keyOf = (row: number, col: number): string => `${row},${col}`;
const sanitizeWord = (value: string): string => value.toUpperCase().replace(/[^A-Z]/g, '');

export const FillInPuzzle: React.FC<Props> = ({ cards, onComplete }) => {
  const layout = useMemo(
    () =>
      generateCrossword(
        cards.map((card) => ({ answer: card.word, clue: card.englishDefinition }))
      ),
    [cards]
  );

  // Map a placed answer back to its card id so each solved word can be scored
  // individually by the scheduler. The generator skips duplicate answers, so the
  // first card with a given normalized word owns it.
  const idByAnswer = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((card) => {
      const key = sanitizeWord(card.word);
      if (!map.has(key)) map.set(key, card.id);
    });
    return map;
  }, [cards]);

  const cellMap = useMemo(() => {
    const map = new Map<string, CrosswordCell>();
    layout.cells.forEach((cell) => map.set(keyOf(cell.row, cell.col), cell));
    return map;
  }, [layout]);

  const [entries, setEntries] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);

  // A batch whose words share no letters can't form a crossword — let the
  // player skip on to the next study batch.
  if (layout.placed.length === 0) {
    return (
      <Paper sx={{ p: 3, width: '100%', maxWidth: 800, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Crossword
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          These cards don&apos;t share enough letters to build a crossword.
        </Typography>
        <Button variant="contained" onClick={() => onComplete([])}>
          Skip puzzle
        </Button>
      </Paper>
    );
  }

  const handleChange = (row: number, col: number, value: string) => {
    if (done) return;
    const letter = value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
    setEntries((prev) => ({ ...prev, [keyOf(row, col)]: letter }));
    setChecked(false);
  };

  const isWordSolved = (word: (typeof layout.placed)[number]): boolean => {
    const length = sanitizeWord(word.answer).length;
    for (let i = 0; i < length; i++) {
      const row = word.direction === 'across' ? word.row : word.row + i;
      const col = word.direction === 'across' ? word.col + i : word.col;
      const cell = cellMap.get(keyOf(row, col));
      if (!cell || (entries[keyOf(row, col)] || '') !== cell.letter) {
        return false;
      }
    }
    return true;
  };

  const countSolved = (): number => layout.placed.filter(isWordSolved).length;

  // Build a per-card result for every placed word so each is scheduled
  // according to whether the player got it right.
  const buildResults = (): BatchResult[] =>
    layout.placed
      .map((word) => {
        const id = idByAnswer.get(sanitizeWord(word.answer));
        return id ? { id, correct: isWordSolved(word) } : null;
      })
      .filter((r): r is BatchResult => r !== null);

  const handleCheck = () => {
    setChecked(true);
    if (countSolved() === layout.placed.length) {
      setDone(true);
      onComplete(buildResults());
    }
  };

  const handleFinish = () => {
    if (done) return;
    setDone(true);
    onComplete(buildResults());
  };

  const solved = countSolved();
  const acrossClues = layout.placed
    .filter((p) => p.direction === 'across')
    .sort((a, b) => a.number - b.number);
  const downClues = layout.placed
    .filter((p) => p.direction === 'down')
    .sort((a, b) => a.number - b.number);

  const renderClueList = (title: string, clues: typeof layout.placed) => (
    <Box sx={{ minWidth: 220, flex: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
        {title}
      </Typography>
      <Stack spacing={0.75}>
        {clues.map((clue) => (
          <Typography key={`${clue.direction}-${clue.number}`} variant="body2">
            <strong>{clue.number}.</strong> {clue.clue}
          </Typography>
        ))}
      </Stack>
    </Box>
  );

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', maxWidth: 900 }}>
      <Typography variant="h6" gutterBottom align="center">
        Crossword — fill in the words from their definitions
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ overflowX: 'auto', mx: { xs: 'auto', md: 0 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layout.cols}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${layout.rows}, ${CELL_SIZE}px)`,
              gap: '2px',
            }}
          >
            {Array.from({ length: layout.rows }).map((_, row) =>
              Array.from({ length: layout.cols }).map((__, col) => {
                const cell = cellMap.get(keyOf(row, col));
                if (!cell) {
                  return <Box key={keyOf(row, col)} sx={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                }

                const value = entries[keyOf(row, col)] || '';
                const isCorrect = checked && value === cell.letter;
                const isWrong = checked && value !== '' && value !== cell.letter;

                return (
                  <Box
                    key={keyOf(row, col)}
                    sx={{
                      position: 'relative',
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '4px',
                      bgcolor: isCorrect
                        ? 'success.light'
                        : isWrong
                          ? 'error.light'
                          : 'background.paper',
                    }}
                  >
                    {cell.number && (
                      <Typography
                        component="span"
                        sx={{
                          position: 'absolute',
                          top: 1,
                          left: 2,
                          fontSize: '0.55rem',
                          lineHeight: 1,
                          color: 'text.secondary',
                          pointerEvents: 'none',
                        }}
                      >
                        {cell.number}
                      </Typography>
                    )}
                    <input
                      aria-label={`Row ${row + 1} column ${col + 1}`}
                      value={value}
                      maxLength={1}
                      disabled={done}
                      onChange={(e) => handleChange(row, col, e.target.value)}
                      style={{
                        width: '100%',
                        height: '100%',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        padding: 0,
                        color: 'inherit',
                      }}
                    />
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, flex: 1 }}>
          {acrossClues.length > 0 && renderClueList('Across', acrossClues)}
          {downClues.length > 0 && renderClueList('Down', downClues)}
        </Box>
      </Box>

      {layout.unplaced.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          {layout.unplaced.length} card(s) didn&apos;t fit this grid and were skipped.
        </Typography>
      )}

      {checked && !done && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Solved {solved} of {layout.placed.length} words. Keep going!
        </Alert>
      )}
      {done && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Puzzle finished — {solved} of {layout.placed.length} words correct.
        </Alert>
      )}

      <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="contained" onClick={handleCheck} disabled={done}>
          Check Answers
        </Button>
        <Button variant="outlined" onClick={handleFinish} disabled={done}>
          Finish &amp; Continue
        </Button>
      </Box>
    </Paper>
  );
};
