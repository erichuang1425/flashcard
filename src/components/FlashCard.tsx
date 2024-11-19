import React, { memo, useState } from 'react';
import { Card, CardContent, Typography, Box, Button, Tooltip, useMediaQuery, Theme, useTheme } from '@mui/material';
import { Flashcard } from '../types';
import { capitalizeFirstWord } from '../utils/helpers';
import { MobileFlashCard } from './study-modes/MobileFlashCard';

interface FlashCardProps {
  card: Flashcard;
  onRating?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  showAnswer?: boolean; 
}

const FlashCard = memo(({ card, onRating, showAnswer = false }: FlashCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return <MobileFlashCard card={card} onRating={onRating} />;
  }

 
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const ratingLabels: { [key: number]: string } = {
    1: '😟',
    2: '😐',
    3: '🙂', 
    4: '😊',
    5: '🎯'
  };

  const handleCardClick = () => {
    if (!isFlipped) setIsFlipped(true);
  };

  const handleFlipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  return (
    <Box sx={{
      width: '100%',
      height: { xs: '450px', sm: '550px' },
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Card sx={{ 
        height: '100%',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: theme => theme.palette.mode === 'dark' 
          ? 'linear-gradient(145deg, #1a1a1a 0%, #262626 100%)'
          : 'linear-gradient(145deg, #fefefe 0%, #ffffff 100%)',
        boxShadow: theme => `
          0 8px 32px ${theme.palette.primary.main}15,
          0 4px 8px rgba(0,0,0,0.1),
          0 16px 24px rgba(0,0,0,0.1)
        `,
        borderRadius: '24px',
        overflow: 'hidden'
      }}>
        {/* Front face */}
        <Box 
          onClick={!isMobile ? handleCardClick : undefined}
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, sm: 3 },
            cursor: 'pointer',
            opacity: isFlipped ? 0 : 1,
            transition: 'all 0.5s ease',
            transform: isFlipped ? 'translateY(-20px)' : 'translateY(0)',
            pointerEvents: isFlipped ? 'none' : 'auto'
          }}
        >
          <Typography 
            variant="h3" 
            sx={{
              fontSize: { xs: '2rem', sm: '3.5rem' }, 
              fontWeight: 700,
              textAlign: 'center',
              background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'float 3s ease-in-out infinite',
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-10px)' },
              },
              transition: 'all 0.5s ease',
              transform: isFlipped ? 'scale(0.7)' : 'none',
            }}
          >
            {card.word}
          </Typography>
          {/* Show answer button - Mobile only */}
          {!isFlipped && isMobile && (
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleFlipClick}
              sx={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: 200
              }}
            >
              Show Answer
            </Button>
          )}
        </Box>

        {/* Back face */}
        <Box sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center', 
          p: { xs: 3, sm: 4 }, 
          pt: { xs: 4, sm: 5 }, 
          opacity: isFlipped ? 1 : 0,
          transition: 'all 0.5s ease',
          transform: isFlipped ? 'translateY(0)' : 'translateY(20px)',
          pointerEvents: isFlipped ? 'auto' : 'none'
        }}>
          <Box sx={{
            width: '100%',
            textAlign: 'center',
            padding: { xs: '0 12px', sm: '0 24px' }, // Increased horizontal padding
            transition: 'all 0.5s ease',
            position: 'relative',
            top: '-5%' // Move content up slightly
          }}>
            <Typography 
              variant="h3" // Changed from h4 to h3
              color="primary"
              sx={{ 
                mb: 3, // Increased margin
                fontWeight: 700,
                fontSize: { xs: '2.5rem', sm: '3.2rem' }, // Increased font size
                opacity: isFlipped ? 1 : 0,
                transform: isFlipped ? 'translateY(0)' : 'translateY(-20px)',
                transition: 'all 0.5s ease 0.2s'
              }}
            >
              {card.word}
            </Typography>
            <Typography 
              variant="h6"
              color="text.secondary"
              sx={{
                fontStyle: 'italic',
                mb: 2,
                fontSize: { xs: '1rem', sm: '1.1rem' } // Slightly smaller
              }}
            >
              {card.partOfSpeech}
            </Typography>
            
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontWeight: 500,
                fontSize: { xs: '1.1rem', sm: '1.25rem' } // Slightly smaller
              }}
            >
              {capitalizeFirstWord(card.englishDefinition)}
            </Typography>
            
            <Typography 
              variant="h5"
              color="primary"
              sx={{ 
                mt: 2,
                fontWeight: 500,
                fontSize: { xs: '1.25rem', sm: '1.5rem' } // Slightly smaller
              }}
            >
              {card.chineseTranslation}
            </Typography>
          </Box>

          {/* Rating buttons */}
          {onRating && isFlipped && (
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: { xs: 0.5, sm: 1.5 },
              p: { xs: 2, sm: 3 }, // Increased padding
              pb: { xs: 3, sm: 4 }, // Extra bottom padding
              width: '100%',
              mx: 'auto',
              position: 'absolute',
              bottom: isMobile ? 80 : 40, // Increased bottom spacing
              left: 0,
              right: 0,
              opacity: isFlipped ? 1 : 0,
              transform: isFlipped ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.5s ease 0.3s',
              '& .MuiButton-root': {
                minWidth: 0,
                width: '100%',
                minHeight: { xs: '44px', sm: '44px' },
                fontSize: { xs: '1.25rem', sm: '1.1rem' },
                p: { xs: '6px 2px', sm: '6px 8px' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                }
              }
            }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Tooltip key={rating} title={ratingLabels[rating]} arrow>
                  <Button
                    onClick={() => onRating(rating as 1 | 2 | 3 | 4 | 5)}
                    variant="contained"
                    color={rating >= 4 ? 'success' : rating >= 3 ? 'primary' : 'error'}
                    sx={{
                      py: { xs: 1, sm: 1.5 },
                      fontWeight: 600,
                    }}
                  >
                    {isSmallScreen
                      ? ratingLabels[rating]
                      : `${ratingLabels[rating]} ${
                        rating === 1 ? 'Again' :
                        rating === 2 ? 'Hard' :
                        rating === 3 ? 'Good' :
                        rating === 4 ? 'Easy' :
                        'Perfect'
                      }`
                    }
                  </Button>
                </Tooltip>
              ))}
            </Box>
          )}
        </Box>
      </Card>

      {/* Hide answer button - Outside card */}
      {isFlipped && !isMobile && (
        <Button
          variant="outlined"
          size="large"
          onClick={handleFlipClick}
          sx={{
            position: 'absolute',
            bottom: -60,
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: 200,
            opacity: isFlipped ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        >
          Hide Answer
        </Button>
      )}
      
      {/* Mobile back button */}
      {isFlipped && isMobile && (
        <Button
          variant="contained"
          size="large"
          onClick={handleFlipClick}
          sx={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: 200,
            zIndex: 1000
          }}
        >
          Back
        </Button>
      )}
    </Box>
  );
});

export default FlashCard;
