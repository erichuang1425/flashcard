import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  LinearProgress,
  Typography,
} from '@mui/material';
import { Article } from '../../types/reading';
import { useI18n } from '../../i18n/I18nContext';

interface ArticleListProps {
  articles: Article[];
  onSelect: (article: Article) => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({
  articles,
  onSelect,
}) => {
  const { t } = useI18n();

  if (articles.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h6">{t('reading.library.empty')}</Typography>
        <Typography color="text.secondary">
          {t('reading.library.emptyHint')}
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {articles.map((article) => (
        <Grid item xs={12} sm={6} lg={4} key={article.id}>
          <Card sx={{ height: '100%' }}>
            <CardActionArea
              onClick={() => onSelect(article)}
              sx={{ height: '100%', alignItems: 'stretch' }}
            >
              {article.coverImage ? (
                <CardMedia
                  component="img"
                  height="150"
                  image={article.coverImage}
                  alt=""
                  sx={{ objectFit: 'cover' }}
                />
              ) : null}
              <CardContent>
                <Chip
                  label={article.category}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Typography variant="h6" gutterBottom>
                  {article.title}
                </Typography>
                {article.subtitle ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {article.subtitle}
                  </Typography>
                ) : null}
                <Typography variant="caption" color="text.secondary">
                  {t('reading.library.metadata', {
                    words: article.wordCount,
                    minutes: article.readingTime,
                  })}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={article.progress.progress}
                  sx={{ mt: 2, height: 6, borderRadius: 3 }}
                />
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
