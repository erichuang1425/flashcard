import React, { useState } from 'react';
import { Fab, Tooltip, useTheme } from '@mui/material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { useAuth } from '../../context/AuthContext';
import { useReadingMode } from '../../context/ReadingModeContext';
import { getRandomArticle } from '../../services/articleService';
import { useI18n } from '../../i18n/I18nContext';

export const RandomArticleButton: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentArticle } = useReadingMode();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();

  const handleRandomArticle = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      const article = await getRandomArticle(user.uid);
      if (article) {
        setCurrentArticle(article);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip title={t('reading.actions.random')} placement="left">
      <Fab
        color="primary"
        size="medium"
        onClick={handleRandomArticle}
        disabled={isLoading}
        sx={{
          position: 'fixed',
          bottom: theme.spacing(3),
          right: theme.spacing(3),
          zIndex: theme.zIndex.speedDial,
        }}
      >
        <ShuffleIcon />
      </Fab>
    </Tooltip>
  );
};