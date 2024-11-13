import React from 'react';
import { Card, CardContent, Typography, Box, Button, Tooltip } from '@mui/material';
import { Flashcard } from '../types';
import { capitalizeFirstWord } from '../utils/helpers';

interface FlashCardProps {
  card: Flashcard;
  onRating?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  showAnswer?: boolean; 
}

export const FlashCard: React.FC<FlashCardProps> = ({ card, onRating, showAnswer = false }) => {
  const ratingLabels: { [key: number]: string } = {
    1: '😟 Again',
    2: '😐 Hard',
    3: '🙂 Good',
    4: '😊 Easy',
    5: '🎯 Perfect'
  };

  return (
    <Box sx={{
      width: '100%',
      height: '500px',
      position: 'relative',
      perspective: '1500px'
    }}>
      <Card sx={{ 
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme => theme.palette.mode === 'dark' 
          ? 'linear-gradient(145deg, #1a1a1a 0%, #262626 100%)'
          : 'linear-gradient(145deg, #fefefe 0%, #ffffff 100%)',
        boxShadow: theme => `0 8px 32px ${theme.palette.primary.main}15`,
        borderRadius: '24px',
        overflow: 'hidden',
      }}>
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          position: 'relative',
        }}>
          {/* Word is always visible */}
          <Typography 
            variant="h3" 
            sx={{
              fontSize: { xs: '2.5rem', sm: '3.5rem' },
              fontWeight: 700,
              mb: 2,
              textAlign: 'center',
              background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {card.word}
          </Typography>

          {/* Definitions and translations fade in */}
          <Box sx={{
            width: '100%',
            textAlign: 'center',
            opacity: showAnswer ? 1 : 0,
            transform: showAnswer ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.3s ease',
            visibility: showAnswer ? 'visible' : 'hidden',
          }}>
            <Typography 
              variant="h6"
              color="text.secondary"
              sx={{
                fontStyle: 'italic',
                mb: 2
              }}
            >
              {card.partOfSpeech}
            </Typography>
            
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              {capitalizeFirstWord(card.englishDefinition)}
            </Typography>
            
            <Typography 
              variant="h5"
              color="primary"
              sx={{ 
                mt: 2,
                fontWeight: 500
              }}
            >
              {card.chineseTranslation}
            </Typography>
          </Box>
        </Box>

        {/* Rating buttons */}
        {onRating && showAnswer && (
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 1,
            p: 2,
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Tooltip key={rating} title={ratingLabels[rating]} arrow>
                <Button
                  onClick={() => onRating(rating as 1 | 2 | 3 | 4 | 5)}
                  variant="contained"
                  color={rating >= 4 ? 'success' : rating >= 3 ? 'primary' : 'error'}
                  sx={{
                    py: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    fontWeight: 600,
                  }}
                >
                  {ratingLabels[rating]}
                </Button>
              </Tooltip>
            ))}
          </Box>
        )}
      </Card>
    </Box>
  );
};
