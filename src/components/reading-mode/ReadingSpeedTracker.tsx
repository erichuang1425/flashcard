import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Tooltip, IconButton } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import { useReadingMode } from '../../context/ReadingModeContext';
import { useI18n } from '../../i18n/I18nContext';

export const ReadingSpeedTracker: React.FC = () => {
  const { readingProgress, currentArticle } = useReadingMode();
  const { t } = useI18n();
  const [wpm, setWpm] = useState(0);
  const [showSpeed, setShowSpeed] = useState(false);

  useEffect(() => {
    if (readingProgress && currentArticle && readingProgress[currentArticle.id]?.readingSpeed) {
      setWpm(readingProgress[currentArticle.id].readingSpeed);
    }
  }, [readingProgress, currentArticle]);

  if (!showSpeed) {
    return (
      <Tooltip title={t('reading.tools.showSpeed')}>
        <IconButton
          onClick={() => setShowSpeed(true)}
          sx={{ position: 'fixed', right: 24, bottom: 24 }}
        >
          <SpeedIcon />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        bgcolor: 'background.paper',
        borderRadius: 2,
        p: 2,
        boxShadow: 3,
        minWidth: 200
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        {t('reading.tools.readingSpeed')}
      </Typography>
      <Typography variant="h4" color="primary">
        {wpm} <Typography component="span" variant="body2">WPM</Typography>
      </Typography>
      <LinearProgress
        variant="determinate"
        value={Math.min((wpm / 500) * 100, 100)}
        sx={{ mt: 1, height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {t('reading.tools.averageSpeed')}: {currentArticle ? readingProgress?.[currentArticle.id]?.readingSpeed || 0 : 0} WPM
      </Typography>
    </Box>
  );
};
