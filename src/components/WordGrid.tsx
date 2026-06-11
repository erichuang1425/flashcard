import React from 'react';
import {
  Grid, Card, CardContent, Typography,
  Box, Chip, Checkbox, IconButton, useTheme, alpha
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { VocabularyWord } from '../types';
import { useInView } from 'react-intersection-observer';
import { useLanguage } from '../i18n/LanguageContext';

interface WordGridProps {
  words: VocabularyWord[];
  onLoadMore?: () => Promise<void> | void;
  hasMore?: boolean;
  /** When true, cards toggle membership in `selectedIds` instead of showing delete buttons. */
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (word: VocabularyWord) => void;
  /** Shows a per-card delete button when provided (outside selection mode). */
  onDeleteWord?: (word: VocabularyWord) => void;
}

export const WordGrid: React.FC<WordGridProps> = ({
  words,
  onLoadMore,
  hasMore = false,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  onDeleteWord,
}) => {
  const theme = useTheme();
  const { t } = useLanguage();
  const { ref } = useInView({
    threshold: 0.1,
    onChange: (inView) => {
      if (inView && hasMore) {
        onLoadMore?.();
      }
    },
  });

  return (
    <Grid container spacing={{ xs: 1.5, sm: 2 }}>
      {words.map((word, index) => {
        const selected = selectionMode && !!selectedIds?.has(word.id);
        return (
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={3}
            key={word.id || index}
            ref={index === words.length - 3 ? ref : undefined}
          >
            <Card
              onClick={selectionMode ? () => onToggleSelect?.(word) : undefined}
              sx={{
                height: '100%',
                transition: 'transform 0.2s',
                cursor: selectionMode ? 'pointer' : 'default',
                outline: selected
                  ? `2px solid ${theme.palette.primary.main}`
                  : '2px solid transparent',
                outlineOffset: -2,
                '&:hover': {
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ flexGrow: 1 }}>
                    {word.word}
                  </Typography>
                  {selectionMode ? (
                    <Checkbox
                      checked={selected}
                      onChange={() => onToggleSelect?.(word)}
                      onClick={(event) => event.stopPropagation()}
                      inputProps={{ 'aria-label': word.word }}
                      sx={{ mt: -1, mr: -1 }}
                    />
                  ) : onDeleteWord ? (
                    <IconButton
                      size="small"
                      aria-label={t('library.deleteWord', { word: word.word })}
                      onClick={() => onDeleteWord(word)}
                      sx={{
                        mt: -0.5,
                        mr: -1,
                        color: 'text.secondary',
                        '&:hover': { color: 'error.main' }
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {word.partOfSpeech}
                </Typography>
                <Typography variant="body1" paragraph>
                  {word.englishDefinition}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {word.categories && word.categories.map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      size="small"
                      sx={{
                        backgroundColor: alpha(theme.palette.primary.main, 0.1)
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};
