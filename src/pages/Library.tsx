import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, Box, Typography, Grid, Skeleton,
  Tabs, Tab, Paper, Divider, useTheme 
} from '@mui/material';
import { CategoryBrowser } from '../components/CategoryBrowser';
import { WordGrid } from '../components/WordGrid';
import { getCategories, getVocabularyWords } from '../services/firestore';
import type { Category, VocabularyWord } from '../types';

export const Library: React.FC = () => {
  const theme = useTheme();
  const [view, setView] = useState<'grid' | 'category'>('grid');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [cats, initialWords] = await Promise.all([
          getCategories(),
          getVocabularyWords()
        ]);
        // Convert firestore Category to app Category type
        const appCategories: Category[] = cats.map(cat => ({
          id: cat.id || '', 
          name: cat.name,
          count: cat.count
        }));
        setCategories(appCategories);
        setWords(initialWords);
        setHasMore(initialWords.length === ITEMS_PER_PAGE);
      } catch (error) {
        console.error('Error loading library data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ 
      minHeight: '100vh',
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
          Library
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
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Grid View" value="grid" />
            <Tab label="Categories" value="category" />
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
              const nextWords = await getVocabularyWords();
              setWords(prev => [...prev, ...nextWords]);
              setHasMore(nextWords.length === ITEMS_PER_PAGE);
              setPage(prev => prev + 1);
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
