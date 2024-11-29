import React, { useEffect } from 'react';
import { Grid, Box, Typography, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import { FlashcardItem } from './FlashcardItem';
import { FlashcardMetadata } from '../../types';
import { useI18n } from '../../i18n/I18nContext';

interface FlashcardGridProps {
  cards: FlashcardMetadata[];
  loading?: boolean;
  onView?: (card: FlashcardMetadata) => void;
  onEdit?: (card: FlashcardMetadata) => void;
  onDelete?: (card: FlashcardMetadata) => void;
}

export const FlashcardGrid: React.FC<FlashcardGridProps> = ({
  cards,
  loading,
  onView,
  onEdit,
  onDelete
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading && !cards.length) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '50vh'
      }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!cards.length) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '50vh'
      }}>
        <Typography color="text.secondary" variant="h6" sx={{ mb: 2 }}>
          {t('library.noResults')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      minHeight: '200px',
      py: { xs: 2, sm: 3 },
      px: { xs: 1, sm: 2 }
    }}>
      <Grid 
        container 
        spacing={{ xs: 2, sm: 2.5, md: 3 }}
        sx={{
          alignItems: 'stretch',
          '& .MuiGrid-item': {
            display: 'flex'
          }
        }}
      >
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={card.id}>
            <FlashcardItem
              card={card}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              isMobile={isMobile}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
