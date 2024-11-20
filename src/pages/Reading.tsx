import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Tabs,
  Tab,
  useTheme,
  Paper,
  CircularProgress
} from '@mui/material';
import { useReadingMode } from '../context/ReadingModeContext';
import { ArticleList } from '../components/reading-mode/ArticleList';
import { ArticleImporter } from '../components/reading-mode/ArticleImporter';
import { ReadingInterface } from '../components/reading-mode/ReadingInterface';
import { ReadingNavigation } from '../components/reading-mode/ReadingNavigation';
import { getUserArticles, checkArticleCache, cacheArticles, getArticlePage, getFullArticle } from '../services/articleService';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { Article } from '../context/ReadingModeContext';
import { DocumentSnapshot, DocumentData } from 'firebase/firestore';
import { logger } from '../services/logging';
import { RandomArticleButton } from '../components/reading-mode/RandomArticleButton';
import { useNavigate, useLocation } from 'react-router-dom';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ mt: 3 }}>
    {value === index && children}
  </Box>
);

interface PaginatedArticles {
  articles: Article[];
  totalCount: number;
  lastUpdated: string;
}

export const Reading: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const { currentArticle, setCurrentArticle } = useReadingMode();
  const [activeTab, setActiveTab] = useState(0);
  const [articleData, setArticleData] = useState<PaginatedArticles>({ 
    articles: [], 
    totalCount: 0,
    lastUpdated: '' 
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 8;
  const navigate = useNavigate();
  const location = useLocation();

  const initializeData = useCallback(async () => {
    if (!user || loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);

    try {
      const result = await getArticlePage(user.uid, {
        page: 1,
        limit: ITEMS_PER_PAGE,
        filters: {
          category: undefined,
          searchTerm: undefined
        }
      });

      if (mountedRef.current) {
        setArticleData({
          articles: result.articles,
          totalCount: result.totalCount,
          lastUpdated: new Date().toISOString()
        });

        // Initialize first page properly
        setPage(1);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError('Failed to load articles');
        logger.error('Initial article load failed', err as Error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [user]);

  // Single effect for initialization
  useEffect(() => {
    mountedRef.current = true;
    
    if (user) {
      initializeData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [user, initializeData]);

  // Remove the separate loadArticles callback and merge functionality into page change handler
  const handlePageChange = useCallback(async (newPage: number) => {
    if (!user || loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const result = await getArticlePage(user.uid, {
        page: newPage,
        limit: ITEMS_PER_PAGE,
        filters: {
          category: undefined,
          searchTerm: undefined
        }
      });

      if (mountedRef.current) {
        setArticleData({
          articles: result.articles,
          totalCount: result.totalCount,
          lastUpdated: new Date().toISOString()
        });
        setPage(newPage);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError('Failed to load articles');
        logger.error('Article page load failed', err as Error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [user]);

  const handleArticleSelect = async (article: Article) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const fullArticle = await getFullArticle(user.uid, article.id);
      
      if (!fullArticle || !fullArticle.content) {
        throw new Error('Failed to load article content');
      }
      
      // Push state with tab info for browser back button
      navigate('', { 
        state: { prevTab: activeTab },
        replace: true 
      });
      
      setCurrentArticle(fullArticle);
    } catch (err) {
      setError('Failed to load article content');
      logger.error('Article content load failed', err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (currentArticle) {
        setCurrentArticle(null);
        // Restore previous tab
        if (event.state?.prevTab !== undefined) {
          setActiveTab(event.state.prevTab);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentArticle]);

  // If viewing an article, show the article interface
  if (currentArticle) {
    return (
      <Box 
        sx={{ 
          backgroundColor: 'background.default', 
          minHeight: '100vh',
          pt: { xs: 2, sm: 3, md: 4 } // Add top padding for better spacing
        }}
      >
        <ReadingNavigation />
        <ReadingInterface />
        <RandomArticleButton />
      </Box>
    );
  }

  // Return early while loading initial data
  if (!articleData && loading) {
    return (
      <Container sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Otherwise show the article library
  const theme = useTheme();
  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        py: { xs: 3, sm: 4, md: 5 }, // Increased vertical padding
        px: { xs: 2, sm: 3, md: 4 }  // Increased horizontal padding
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: { xs: 3, sm: 4 }, // Increased margin bottom
        gap: 2 
      }}>
        <ReadingNavigation />
      </Box>

      <Paper 
        sx={{ 
          mt: { xs: 2, sm: 3 },
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: theme => theme.shadows[2]
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            backgroundColor: theme.palette.background.paper
          }}
        >
          <Tab label={t('reading.tabs.library')} />
          <Tab label={t('reading.tabs.import')} />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <ArticleList 
              articles={articleData.articles}
              onArticleSelect={handleArticleSelect}
              totalCount={articleData.totalCount}
              isLoading={loading}
              onPageChange={async (newPage) => {
                await handlePageChange(newPage);
              }}
              currentPage={page}
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <ArticleImporter />
        </TabPanel>
      </Paper>
      <RandomArticleButton />
    </Container>
  );
};