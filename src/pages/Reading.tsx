import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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
import { ManageArticlesTab } from '../components/reading-mode/ManageArticlesTab';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const ITEMS_PER_PAGE = 8;

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
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isPortrait = useMediaQuery('(orientation: portrait)');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'readTime' | 'progress' | 'random'>('recent');


  const handleSearchSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      setSearchQuery(searchTerm);
    }
  };


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
          searchTerm: searchQuery.trim() || undefined 
        },
        sort: {
          sortBy: sortBy
        }
      });

      if (mountedRef.current) {
        setArticleData({
          articles: result.articles,
          totalCount: result.totalCount,
          lastUpdated: new Date().toISOString()
        });


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
  }, [user, searchQuery, sortBy]); 


  useEffect(() => {
    mountedRef.current = true;
    
    if (user) {
      initializeData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [user, initializeData]);


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
          searchTerm: searchQuery.trim() || undefined  
        },
        sort: {
          sortBy: sortBy
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
  }, [user, searchQuery, sortBy]);


  useEffect(() => {
    if (mountedRef.current) {
      initializeData();
    }
  }, [searchQuery, sortBy, initializeData]);

  const handleArticleSelect = async (article: Article) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const fullArticle = await getFullArticle(user.uid, article.id);
      
      if (!fullArticle || !fullArticle.content) {
        throw new Error('Failed to load article content');
      }
      

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

  useEffect(() => {
    // Clear current article when directly navigating to reading page
    const clearArticle = () => setCurrentArticle(null);
    clearArticle();
  }, []);

  useEffect(() => {
    // Handle browser back button
    const handlePopState = (event: PopStateEvent) => {
      if (currentArticle) {
        setCurrentArticle(null);
        if (event.state?.prevTab !== undefined) {
          setActiveTab(event.state.prevTab);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentArticle]);

 
  if (currentArticle) {
    return (
      <Box 
        sx={{ 
          backgroundColor: 'background.default', 
          minHeight: '100vh',
          pt: { xs: 2, sm: 3, md: 4 }
        }}
      >
        <ReadingNavigation />
        <ReadingInterface />
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
  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        py: { xs: 3, sm: 4, md: 5 },
        px: { xs: 2, sm: 3, md: 4 } 
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: { xs: 3, sm: 4 }, 
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
          <Tab label={t('reading.tabs.manage')} />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {/* Add new controls section */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: isMobile && isPortrait ? 'column' : 'row',
              alignItems: isMobile && isPortrait ? 'stretch' : 'center',
              gap: { xs: 1, sm: 2 },
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('reading.library.search')} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchSubmit}  
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, sm: 2 },
                flexShrink: 0,
                alignItems: 'center',
                mt: isMobile && isPortrait ? 1 : 0
              }}
            >
              <FormControl size="small" sx={{ width: { xs: 90, sm: 120 } }}>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  displayEmpty
                >
                  <MenuItem value="recent">{t('reading.library.sortBy.recent')}</MenuItem>
                  <MenuItem value="title">{t('reading.library.sortBy.title')}</MenuItem>
                  <MenuItem value="readTime">{t('reading.library.sortBy.readTime')}</MenuItem>
                  <MenuItem value="progress">{t('reading.library.sortBy.progress')}</MenuItem>
                  <MenuItem value="random">{t('reading.library.sortBy.random')}</MenuItem>
                </Select>
              </FormControl>
              <RandomArticleButton hideOnMobile={false} />
            </Box>
          </Box>

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

        <TabPanel value={activeTab} index={2}>
          <ManageArticlesTab 
            articles={articleData.articles}
            onArticlesDeleted={initializeData}
          />
        </TabPanel>
      </Paper>

    </Container>
  );
};