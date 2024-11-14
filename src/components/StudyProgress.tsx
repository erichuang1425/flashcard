import React from 'react';
import { Box, Typography, LinearProgress, Button } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useI18n } from '../i18n/I18nContext';
import type { StudyProgress as StudyProgressType } from '../types';

interface StudyProgressProps {
  progress: StudyProgressType;
  total: number;
  onSaveExit?: () => void;
}

export const StudyProgress: React.FC<StudyProgressProps> = ({ progress, total, onSaveExit }) => {
  const { t } = useI18n();

  const calculateProgress = () => {
    if (!total) return 0;
    return Math.floor((progress.stats.cardsReviewed / total) * 100);
  };

  const accuracy = progress.stats.cardsReviewed ? 
    Math.round((progress.stats.correct / progress.stats.cardsReviewed) * 100) : 0;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('study.progress.overall')}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={calculateProgress()} 
          sx={{ height: 8, borderRadius: 1, mb: 1 }}
        />
        <Typography variant="body2" color="text.secondary">
          {progress.stats.cardsReviewed} / {total} {t('study.progress.cardsCompleted')}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('study.progress.accuracy')}: {accuracy}%
        </Typography>
        <Typography variant="body2">
          {t('study.progress.correct')}: {progress.stats.correct}
        </Typography>
        <Typography variant="body2">
          {t('study.progress.incorrect')}: {progress.stats.incorrect}
        </Typography>
      </Box>

      {onSaveExit && (
        <Button
          fullWidth
          variant="outlined"
          startIcon={<SaveIcon />}
          onClick={onSaveExit}
          sx={{ mt: 2 }}
        >
          {t('study.controls.saveExit')}
        </Button>
      )}
    </Box>
  );
};
