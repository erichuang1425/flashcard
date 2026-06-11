import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  FormControl,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../context/AuthContext';
import { useReadingMode } from '../context/ReadingModeContext';
import {
  getArticlePage,
  getFullArticle,
} from '../services/articleService';
import { Article, ArticleSort } from '../types/reading';
import { useI18n } from '../i18n/I18nContext';
import { ArticleList } from '../components/reading-mode/ArticleList';
import { ArticleImporter } from '../components/reading-mode/ArticleImporter';
import { ManageArticlesTab } from '../components/reading-mode/ManageArticlesTab';
import { ReadingInterface } from '../components/reading-mode/ReadingInterface';

const PAGE_SIZE = 9;

export const Reading: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const { currentArticle, setCurrentArticle } = useReadingMode();
  const [articles, setArticles] = useState<Article[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<ArticleSort>('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadArticles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const result = await getArticlePage(user.uid, {
        page,
        limit: PAGE_SIZE,
        filters: { searchTerm },
        sort: { sortBy },
      });
      setArticles(result.articles);
      setTotalCount(result.totalCount);
    } catch (loadError) {
      console.error('Failed to load articles:', loadError);
      setError(t('reading.library.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, sortBy, t, user]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const selectArticle = async (article: Article) => {
    if (!user) return;
    setLoading(true);
    try {
      const fullArticle = await getFullArticle(user.uid, article.id);
      if (!fullArticle?.content) {
        setError(t('reading.library.contentMissing'));
        return;
      }
      setCurrentArticle(fullArticle);
    } catch (selectError) {
      console.error('Failed to open article:', selectError);
      setError(t('reading.library.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (currentArticle) return <ReadingInterface />;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h3" component="h1" gutterBottom>
        {t('reading.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('reading.subtitle')}
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Paper>
        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab label={t('reading.tabs.library')} />
          <Tab label={t('reading.tabs.import')} />
          <Tab label={t('reading.tabs.manage')} />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {tab === 0 ? (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  mb: 3,
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t('reading.library.search')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <Select
                    value={sortBy}
                    onChange={(event) => {
                      setSortBy(event.target.value as ArticleSort);
                      setPage(1);
                    }}
                  >
                    <MenuItem value="recent">{t('reading.sort.recent')}</MenuItem>
                    <MenuItem value="title">{t('reading.sort.title')}</MenuItem>
                    <MenuItem value="readTime">{t('reading.sort.readTime')}</MenuItem>
                    <MenuItem value="progress">{t('reading.sort.progress')}</MenuItem>
                    <MenuItem value="random">{t('reading.sort.random')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ArticleList articles={articles} onSelect={selectArticle} />
              )}
              {totalCount > PAGE_SIZE ? (
                <Pagination
                  page={page}
                  count={Math.ceil(totalCount / PAGE_SIZE)}
                  onChange={(_, value) => setPage(value)}
                  sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}
                />
              ) : null}
            </>
          ) : null}
          {tab === 1 ? (
            <ArticleImporter
              onImported={async () => {
                setTab(0);
                setPage(1);
                await loadArticles();
              }}
            />
          ) : null}
          {tab === 2 ? (
            <ManageArticlesTab articles={articles} onChanged={loadArticles} />
          ) : null}
        </Box>
      </Paper>
    </Container>
  );
};
