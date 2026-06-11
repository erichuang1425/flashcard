import React, { useMemo, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography,
  CardActionArea, Chip, IconButton, useTheme, alpha, Button
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Category, VocabularyWord } from '../types';
import { WordGrid } from './WordGrid';
import { useLanguage } from '../i18n/LanguageContext';

interface CategoryBrowserProps {
  categories: Category[];
  /** The user's full word list; category views filter it client-side so
   *  deletions made elsewhere on the page stay in sync. */
  words: VocabularyWord[];
  /** Shows a delete button on each category card when provided. */
  onDeleteCategory?: (category: Category) => void;
  /** Shows a per-word delete button inside a category when provided. */
  onDeleteWord?: (word: VocabularyWord) => void;
}

export const CategoryBrowser: React.FC<CategoryBrowserProps> = ({
  categories,
  words,
  onDeleteCategory,
  onDeleteWord,
}) => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getRandomColor = (seed: string) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.success.main
    ];
    const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const categoryWords = useMemo(
    () =>
      selectedCategory
        ? words.filter(word => word.categories?.includes(selectedCategory))
        : [],
    [words, selectedCategory]
  );

  return (
    <Box>
      {selectedCategory ? (
        <>
          <Button
            variant="outlined"
            onClick={() => setSelectedCategory(null)}
            sx={{ mb: 2 }}
          >
            {t('library.backToCategories')}
          </Button>
          <WordGrid words={categoryWords} onDeleteWord={onDeleteWord} />
        </>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {categories.map((category) => {
            const color = getRandomColor(category.name);
            return (
              <Grid item xs={6} sm={6} md={4} lg={3} key={category.id}>
                <Card
                  sx={{
                    height: '100%',
                    position: 'relative',
                    backgroundColor: alpha(color, 0.1),
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)'
                    }
                  }}
                >
                  {onDeleteCategory && (
                    <IconButton
                      size="small"
                      aria-label={t('library.deleteCategory', { name: category.name })}
                      onClick={() => onDeleteCategory(category)}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1,
                        color: 'text.secondary',
                        '&:hover': { color: 'error.main' }
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                  <CardActionArea
                    onClick={() => setSelectedCategory(category.name)}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ pr: onDeleteCategory ? 3 : 0 }}>
                        {category.name}
                      </Typography>
                      <Chip
                        label={t('library.wordCount', { count: category.count })}
                        size="small"
                        sx={{
                          backgroundColor: alpha(color, 0.2),
                          color: theme.palette.getContrastText(alpha(color, 0.2))
                        }}
                      />
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};
