import React, { useState } from 'react';
import { Fab, Tooltip, Box, SxProps, Theme } from '@mui/material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { useAuth } from '../../context/AuthContext';
import { useReadingMode } from '../../context/ReadingModeContext';
import { getRandomArticle } from '../../services/articleService';
import { useI18n } from '../../i18n/I18nContext';
import { logger } from '../../services/logging';

interface RandomArticleButtonProps {
  sx?: SxProps<Theme>;
  hideOnMobile?: boolean;
}

export const RandomArticleButton: React.FC<RandomArticleButtonProps> = ({
  sx,
  hideOnMobile = false // Changed default to false to show on mobile
}) => {
  const { user } = useAuth();
  const { setCurrentArticle } = useReadingMode();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  const handleRandomArticle = async () => {
    if (!user || isLoading) return;
    setIsLoading(true);
    try {
      const article = await getRandomArticle(user.uid);
      if (article) {
        setCurrentArticle(article);
      }
    } catch (err) {
      logger.error('Failed to get random article', err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip title={t('reading.actions.random')} placement="left">
      <Box 
        sx={{ 
          display: 'block', // Always show
          ...sx 
        }}
      >
        <Fab
          color="primary"
          size="small"
          onClick={handleRandomArticle}
          disabled={isLoading}
          sx={{
            width: { xs: 36, sm: 40 }, // Smaller on mobile
            height: { xs: 36, sm: 40 }, // Smaller on mobile
            minHeight: 'auto',
            boxShadow: theme => `0 4px 12px ${theme.palette.primary.main}40`
          }}
        >
          <ShuffleIcon sx={{ fontSize: { xs: 20, sm: 24 } }} /> {/* Smaller icon on mobile */}
        </Fab>
      </Box>
    </Tooltip>
  );
};