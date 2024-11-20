import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  CardActionArea,
  CardContent,
  Stack,
  LinearProgress,
  CircularProgress,
  Button,
  Pagination,
  Card,
  useMediaQuery,
  useTheme,
  Skeleton
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { Article } from '../../context/ReadingModeContext';
import { useI18n } from '../../i18n/I18nContext';
import { Paper3D } from '../common/Paper3D';
import { searchArticles, getArticlePage } from '../../services/articleService';
import debounce from 'lodash/debounce';
import { logger } from '../../services/logging';

interface ArticleListProps {
  articles: Article[];
  onArticleSelect: (article: Article) => void;
  totalCount: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  currentPage: number;
}

export const ArticleList: React.FC<ArticleListProps> = ({
  articles,
  onArticleSelect,
  totalCount,
  isLoading,
  onPageChange,
  currentPage
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const ITEMS_PER_PAGE = 8;

  // Remove local state management since it's now controlled by parent
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    onPageChange(value);
  };

  const renderArticleCard = useCallback((article: Article) => {
    const hasImage = Boolean(article.coverImage);
    const progress = article.progress ? Math.round((article.progress.wordsRead / article.wordCount) * 100) : 0;
    
    return (
      <Paper3D 
        elevation={2}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8],
          }
        }}
      >
        <CardActionArea 
          onClick={() => onArticleSelect(article)}
          sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CardContent sx={{ 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: hasImage ? 2 : 3
          }}>
            {article.coverImage ? (
              <Box 
                component="img"
                src={article.coverImage}
                alt={article.title}
                sx={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover',
                  borderRadius: 1,
                }}
              />
            ) : (
              <Box sx={{
                height: 200,
                bgcolor: theme => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}>
                <Typography variant="h3" color="text.secondary" sx={{ opacity: 0.5 }}>
                  {article.title.charAt(0)}
                </Typography>
              </Box>
            )}

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.3,
                minHeight: '2.6em'
              }}>
                {article.title}
              </Typography>
              
              {article.subtitle && (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {article.subtitle}
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 'auto' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('reading.interface.wordCount', { values:{values: article.wordCount }})}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {progress > 0 && (
                    `${progress}% ${t('reading.interface.progress.completed')}`
                  )}
                </Typography>
              </Stack>

              <LinearProgress 
                variant="determinate" 
                value={progress}
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  bgcolor: theme => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                  visibility: progress > 0 ? 'visible' : 'hidden'
                }}
              />
            </Box>
          </CardContent>
        </CardActionArea>
      </Paper3D>
    );
  }, [onArticleSelect, t, theme]);

  return (
    <Box sx={{ height: '100%', width: '100%', overflow: 'auto' }}>
      {isLoading ? (
        <Grid container spacing={3} sx={{ p: 2 }}>
          {[...Array(ITEMS_PER_PAGE)].map((_, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Skeleton 
                variant="rectangular" 
                height={400} 
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : articles.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {t('reading.library.empty')}
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ p: 2 }}>
            {articles.map((article) => (
              <Grid item xs={12} md={6} key={article.id}>
                {renderArticleCard(article)}
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ 
            mt: 4, 
            mb: 2, 
            display: 'flex', 
            justifyContent: 'center' 
          }}>
            <Pagination
              count={Math.ceil(totalCount / ITEMS_PER_PAGE)}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Box>
        </>
      )}
    </Box>
  );
};