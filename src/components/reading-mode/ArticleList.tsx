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
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transformStyle: 'preserve-3d',
          position: 'relative',
          '&:hover': {
            transform: 'translateY(-8px) rotateX(4deg)',
            '& .MuiCardContent-root': {
              borderColor: 'primary.main',
            },
            '& .article-tag': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
            },
            '& .article-overlay': {
              opacity: article.progress?.completed ? 0.15 : 0
            }
          }
        }}
      >
        <CardActionArea 
          onClick={() => onArticleSelect(article)}
          sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <Box
            className="article-overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'success.main',
              opacity: article.progress?.completed ? 0.1 : 0,
              transition: 'opacity 0.3s ease',
              zIndex: 1,
              pointerEvents: 'none'
            }}
          />
          <CardContent 
            sx={{ 
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              p: 0,
              position: 'relative',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'border-color 0.3s ease',
            }}
          >
            <Box 
              className="article-tag"
              sx={{
                position: 'absolute',
                top: 16,
                right: -32,
                px: 4,
                py: 0.5,
                bgcolor: 'grey.100',
                color: 'text.secondary',
                transform: 'rotate(45deg)',
                transformOrigin: 'center',
                zIndex: 1,
                typography: 'caption',
                fontWeight: 500,
                transition: 'all 0.3s ease',
                boxShadow: 1
              }}
            >
              {article.category}
            </Box>

            {article.coverImage ? (
              <Box 
                component="img"
                src={article.coverImage}
                alt={article.title}
                sx={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Box sx={{
                height: 200,
                background: theme => `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.light})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.2) 100%)',
                }
              }}>
                <Typography 
                  variant="h2" 
                  sx={{ 
                    color: 'common.white',
                    opacity: 0.8,
                    fontWeight: 700,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  {article.title.charAt(0)}
                </Typography>
              </Box>
            )}

            <Box sx={{ 
              flexGrow: 1, 
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              <Typography 
                variant="h6" 
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  color: 'text.primary',
                }}
              >
                {article.title}
              </Typography>
              
              {article.subtitle && (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 'auto',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.5
                  }}
                >
                  {article.subtitle}
                </Typography>
              )}

              <Box sx={{ mt: 'auto', p: 2 }}>
                <Stack 
                  direction="row" 
                  spacing={2} 
                  alignItems="center" 
                  sx={{ mb: 1 }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: article.progress?.completed ? 'success.main' : 'text.secondary',
                      '& > span': {
                        fontWeight: 600,
                        color: article.progress?.completed ? 'success.main' : 'text.primary'
                      }
                    }}
                  >
                    <span>{article.wordCount}</span> words
                  </Typography>
                  {progress > 0 && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: article.progress?.completed ? 'success.main' : 'text.secondary',
                        fontWeight: 500 
                      }}
                    >
                      {progress}% completed
                    </Typography>
                  )}
                </Stack>

                <LinearProgress 
                  variant="determinate" 
                  value={progress}
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                    visibility: progress > 0 ? 'visible' : 'hidden',
                    '& .MuiLinearProgress-bar': {
                      backgroundImage: theme => 
                        `linear-gradient(45deg, ${
                          article.progress?.completed ? theme.palette.success.main : theme.palette.primary.main
                        }, ${
                          article.progress?.completed ? theme.palette.success.light : theme.palette.primary.light
                        })`
                    }
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>
      </Paper3D>
    );
  }, [onArticleSelect, theme]);

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