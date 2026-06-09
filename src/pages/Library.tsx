import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Box, Typography, Grid, Skeleton,
  Tabs, Tab, Paper
} from '@mui/material';
import { CategoryBrowser } from '../components/CategoryBrowser';
import { WordGrid } from '../components/WordGrid';
import { getCategories, getVocabularyWords } from '../services/firestore';
import type { Category, VocabularyWord } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

export const Library: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [view, setView] = useState<'grid' | 'category'>('grid');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  // All public words are fetched once; pagination is done client-side by
  // growing the visible window. Previously "Load More" re-fetched the full
  // unpaginated list and appended it, duplicating every card on screen.
  const [allWords, setAllWords] = useState<VocabularyWord[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const ITEMS_PER_PAGE = 20;

  const words = useMemo(() => allWords.slice(0, visibleCount), [allWords, visibleCount]);
  const hasMore = visibleCount < allWords.length;

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [cats, initialWords] = await Promise.all([
          getCategories(user.uid),
          getVocabularyWords()
        ]);
        // Convert firestore Category to app Category type
        const appCategories: Category[] = cats.map(cat => ({
          id: cat.id || '',
          name: cat.name,
          count: cat.count
        }));
        setCategories(appCategories);
        setAllWords(initialWords);
        setVisibleCount(ITEMS_PER_PAGE);
      } catch (error) {
        console.error('Error loading library data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [user]);

  return (
    <Container maxWidth="lg" sx={{
      minHeight: '100%',
      py: { xs: 2, sm: 4 }
    }}>
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3 }
      }}>
        <Typography variant="h4"
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem' },
            mb: { xs: 1, sm: 2 }
          }}
        >
          {t('library.title')}
        </Typography>
        
        <Paper sx={{ 
          mb: { xs: 2, sm: 3 },
          '& .MuiTab-root': {
            minHeight: { xs: '48px', sm: '56px' }
          }
        }}>
          <Tabs
            value={view}
            onChange={(_, newValue) => setView(newValue)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={t('library.gridView')} value="grid" />
            <Tab label={t('library.categories')} value="category" />
          </Tabs>
        </Paper>

        {loading ? (
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {[...Array(8)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rectangular" height={200} />
              </Grid>
            ))}
          </Grid>
        ) : view === 'grid' ? (
          <WordGrid
            words={words}
            onLoadMore={async () => {
              setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, allWords.length));
            }}
            hasMore={hasMore}
          />
        ) : (
          <CategoryBrowser categories={categories} />
        )}
      </Box>
    </Container>
  );
};
