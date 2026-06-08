import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography,
  CardActionArea, Chip, useTheme, alpha, Button
} from '@mui/material';
import { Category, VocabularyWord } from '../types';
import { getVocabularyWords } from '../services/firestore';
import { useLanguage } from '../i18n/LanguageContext';

interface CategoryBrowserProps {
  categories: Category[];
}

export const CategoryBrowser: React.FC<CategoryBrowserProps> = ({ categories }) => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryWords, setCategoryWords] = useState<VocabularyWord[]>([]);

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

  useEffect(() => {
    if (selectedCategory) {
      const loadCategoryWords = async () => {
        const words = await getVocabularyWords();
        const filtered = words.filter(word => 
          word.categories?.includes(selectedCategory)
        );
        setCategoryWords(filtered);
      };
      loadCategoryWords();
    } else {
      setCategoryWords([]);
    }
  }, [selectedCategory]);

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
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {categoryWords.map((word, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {word.word}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {word.partOfSpeech}
                    </Typography>
                    <Typography variant="body1">
                      {word.englishDefinition}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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
                    backgroundColor: alpha(color, 0.1),
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)'
                    }
                  }}
                >
                  <CardActionArea
                    onClick={() => setSelectedCategory(category.name)}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
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
