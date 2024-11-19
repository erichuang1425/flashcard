import React, { memo, useState } from 'react';
import { Card, Typography, Box, Button, Tooltip } from '@mui/material';
import type { Flashcard } from '../../types';
import { capitalizeFirstWord } from '../../utils/helpers';

interface MobileFlashCardProps {
  card: Flashcard;
  onRating?: (rating: 1 | 2 | 3 | 4 | 5) => void;
}

export const MobileFlashCard = memo(({ card, onRating }: MobileFlashCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const ratingLabels: { [key: number]: string } = {
    1: '😟',
    2: '😐',
    3: '🙂', 
    4: '😊',
    5: '🎯'
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: 'calc(100vh - 200px)',
      position: 'relative' 
    }}>
      <Card sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '24px',
        background: theme => theme.palette.mode === 'dark' 
          ? 'linear-gradient(145deg, #1a1a1a 0%, #262626 100%)'
          : 'linear-gradient(145deg, #fefefe 0%, #ffffff 100%)',
        boxShadow: theme => `
          0 8px 32px ${theme.palette.primary.main}15,
          0 4px 8px rgba(0,0,0,0.1),
          0 16px 24px rgba(0,0,0,0.1)
        `,
        position: 'relative'
      }}>
        {/* Front */}
        <Box sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 3,
          opacity: isFlipped ? 0 : 1,
          transform: `rotateY(${isFlipped ? '90deg' : '0'})`,
          transition: 'all 0.3s ease',
          pointerEvents: isFlipped ? 'none' : 'auto',
          animation: 'float 3s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-10px)' },
          },
        }}>
          <Typography variant="h3" sx={{ 
            fontSize: '2.5rem',
            fontWeight: 700,
            textAlign: 'center',
            mb: 4,
            background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {card.word}
          </Typography>
          
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => setIsFlipped(true)}
            sx={{ 
              maxWidth: '200px',
              position: 'absolute',
              bottom: 24
            }}
          >
            Show Answer
          </Button>
        </Box>

        {/* Back */}
        <Box sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          opacity: isFlipped ? 1 : 0,
          transform: `rotateY(${isFlipped ? '0' : '-90deg'})`,
          transition: 'all 0.5s ease',
          pointerEvents: isFlipped ? 'auto' : 'none'
        }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
              {card.word}
            </Typography>
            
            <Typography variant="subtitle1" color="text.secondary">
              {card.partOfSpeech}
            </Typography>
            
            <Typography variant="h6" sx={{ textAlign: 'center' }}>
              {capitalizeFirstWord(card.englishDefinition)}
            </Typography>
            
            <Typography variant="h5" color="primary">
              {card.chineseTranslation}
            </Typography>
          </Box>

          {onRating && (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 1,
              mt: 2
            }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Tooltip key={rating} title={ratingLabels[rating]} arrow>
                  <Button
                    onClick={() => {
                      onRating(rating as 1 | 2 | 3 | 4 | 5);
                      setIsFlipped(false);
                    }}
                    variant="contained"
                    color={rating >= 4 ? 'success' : rating >= 3 ? 'primary' : 'error'}
                    sx={{ minWidth: 0 }}
                  >
                    {ratingLabels[rating]}
                  </Button>
                </Tooltip>
              ))}
            </Box>
          )}

          <Button
            variant="outlined"
            onClick={() => setIsFlipped(false)}
            sx={{ mt: 2 }}
          >
            Back
          </Button>
        </Box>
      </Card>
    </Box>
  );
});