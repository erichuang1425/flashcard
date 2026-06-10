import React from 'react';
import { Box, LinearProgress, Typography, Paper, CircularProgress } from '@mui/material';
import type { StudyProgress } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface StudyProgressProps {
  progress: StudyProgress;
  total: number;
}

const StudyProgress: React.FC<StudyProgressProps> = ({ progress, total }) => {
  const { t } = useLanguage();
  const completion = total > 0 ? (progress.cardsReviewed / total) * 100 : 0;
  const accuracy = progress.cardsReviewed > 0 
    ? (progress.correct / progress.cardsReviewed) * 100 
    : 0;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      {/* Progress section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>{t('study.progress.overall')}</Typography>
        <LinearProgress 
          variant="determinate" 
          value={completion} 
          sx={{ 
            height: 10, 
            borderRadius: 5,
            backgroundColor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5
            }
          }} 
        />
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          {t('study.progress.reviewed', { reviewed: progress.cardsReviewed, total })}
        </Typography>
      </Box>

      {/* Stats grid — two columns via flex wrap (MUI v6 Grid v2 `size` would
          also work; flex keeps it deprecation-free and dependency-light). The
          16px gap means each column is `calc(50% - 8px)`. */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {/* Streak stat */}
        <Box sx={{ width: 'calc(50% - 8px)' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h4"
              sx={{
                color: theme => progress.streak >= 5 ? theme.palette.success.main : 'text.primary'
              }}
            >
              {progress.streak}
            </Typography>
            <Typography variant="body2">{t('study.progress.streak')}</Typography>
          </Box>
        </Box>

        {/* Accuracy stat */}
        <Box sx={{ width: 'calc(50% - 8px)' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress
                variant="determinate"
                value={accuracy}
                size={60}
                thickness={4}
                sx={{ color: theme => accuracy >= 70 ? theme.palette.success.main : theme.palette.warning.main }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  {accuracy.toFixed(0)}%
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>{t('study.progress.accuracy')}</Typography>
          </Box>
        </Box>

        {/* Additional stats */}
        <Box sx={{ width: 'calc(50% - 8px)' }}>
          <Typography variant="body2" color="text.secondary">
            {t('study.progress.correct', { count: progress.correct })}
          </Typography>
        </Box>
        <Box sx={{ width: 'calc(50% - 8px)' }}>
          <Typography variant="body2" color="text.secondary">
            {t('study.progress.incorrect', { count: progress.incorrect })}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export { StudyProgress };
