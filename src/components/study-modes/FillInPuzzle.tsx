import React, { useState, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup
} from '@mui/material';
import type { Flashcard } from '../../types';
import { saveStudyProgress } from '../../services/firestore';
import { useI18n } from '../../i18n/I18nContext';
import { useAudio } from '../../hooks/useAudio';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - no types for this package
import { generateLayout } from 'crossword-layout-generator';

interface Cell {
  solution: string;
  value: string;
  isBlock: boolean;
}

interface Props {
  cards: Flashcard[];
  onComplete: (count: number) => void;
}

export const FillInPuzzle: React.FC<Props> = ({ cards, onComplete }) => {
  const { t } = useI18n();
  const { playSound } = useAudio();
  const [batchSize, setBatchSize] = useState(5);
  const [mode, setMode] = useState<'random' | 'manual'>('random');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [layout, setLayout] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const chosenCards = useRef<Flashcard[]>([]);

  const handleGenerate = () => {
    const count = Math.min(batchSize, cards.length);
    let chosen: Flashcard[] = [];
    if (mode === 'manual') {
      chosen = cards.filter(c => selectedIds.includes(c.id)).slice(0, count);
      if (chosen.length !== count) return;
    } else {
      chosen = [...cards].sort(() => Math.random() - 0.5).slice(0, count);
    }

    const input = chosen.map(c => ({ clue: c.chineseTranslation, answer: c.word }));
    const l = generateLayout(input);
    const g: Cell[][] = l.table.map((row: string[]) =>
      row.map((ch: string) => ({
        solution: ch === '-' ? '' : ch,
        value: '',
        isBlock: ch === '-'
      }))
    );
    chosenCards.current = chosen;
    setGrid(g);
    setLayout(l);
    setMessage(null);
  };

  const handleChange = (r: number, c: number, val: string) => {
    const char = val.slice(-1).toUpperCase();
    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[r][c].value = char;
      return next;
    });
  };

  const handleCheck = async () => {
    if (!layout) return;
    const correct = grid.every(row =>
      row.every(cell => cell.isBlock || cell.value.toLowerCase() === cell.solution.toLowerCase())
    );

    playSound(correct ? 'CORRECT_ANSWER' : 'WRONG_ANSWER');

    if (correct) {
      const count = chosenCards.current.length;
      for (const card of chosenCards.current) {
        await saveStudyProgress(card.userId, {
          cardId: card.id,
          rating: 4,
          isCorrect: true,
          mode: 'fillInPuzzle',
          timeSpent: 0
        });
      }
      setMessage(t('study.fillInPuzzle.correct'));
      onComplete(count);
    } else {
      setMessage(t('study.fillInPuzzle.incorrect'));
    }
  };

  if (!layout) {
    return (
      <Paper sx={{ p: 3, width: '100%', maxWidth: 600 }}>
        <Typography variant="h5" gutterBottom>
          {t('study.modes.fillPuzzle')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('study.fillInPuzzle.batchSize')}
            type="number"
            value={batchSize}
            onChange={e => setBatchSize(Number(e.target.value))}
            inputProps={{ min: 1, max: cards.length }}
          />
          <FormControl>
            <InputLabel>{t('study.fillInPuzzle.selectionMode')}</InputLabel>
            <Select value={mode} label={t('study.fillInPuzzle.selectionMode')} onChange={e => setMode(e.target.value as 'random' | 'manual')}>
              <MenuItem value="random">{t('study.fillInPuzzle.random')}</MenuItem>
              <MenuItem value="manual">{t('study.fillInPuzzle.manual')}</MenuItem>
            </Select>
          </FormControl>
          {mode === 'manual' && (
            <FormGroup sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {cards.map(card => (
                <FormControlLabel
                  key={card.id}
                  control={
                    <Checkbox
                      checked={selectedIds.includes(card.id)}
                      onChange={() =>
                        setSelectedIds(prev =>
                          prev.includes(card.id)
                            ? prev.filter(id => id !== card.id)
                            : [...prev, card.id]
                        )
                      }
                    />
                  }
                  label={card.word}
                />
              ))}
            </FormGroup>
          )}
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={batchSize < 1 || (mode === 'manual' && selectedIds.length !== Math.min(batchSize, cards.length))}
          >
            {t('study.fillInPuzzle.generate')}
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, width: '100%', maxWidth: 600 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${layout.cols}, 40px)`,
            gap: 0.5,
            justifyContent: 'center'
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) =>
              cell.isBlock ? (
                <Box
                  key={`${r}-${c}`}
                  sx={{ width: 40, height: 40, bgcolor: 'grey.300', borderRadius: 1 }}
                />
              ) : (
                <TextField
                  key={`${r}-${c}`}
                  value={cell.value}
                  onChange={e => handleChange(r, c, e.target.value)}
                  inputProps={{ maxLength: 1, style: { textAlign: 'center' } }}
                />
              )
            )
          )}
        </Box>
        <Box>
          {layout.result.map((w: any) => (
            <Typography key={w.answer}>{`${w.position}. ${w.clue}`}</Typography>
          ))}
        </Box>
        {message && (
          <Typography align="center" color="primary">
            {message}
          </Typography>
        )}
        <Button variant="contained" onClick={handleCheck}>
          {t('study.fillInPuzzle.check')}
        </Button>
      </Box>
    </Paper>
  );
};

