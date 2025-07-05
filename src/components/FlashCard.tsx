import React, { memo, useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Button, Tooltip, useMediaQuery, Theme, useTheme } from '@mui/material';
import { Flashcard, FlashcardMetadata } from '../types';
import { capitalizeFirstWord } from '../utils/helpers';
import { useI18n } from '../i18n/I18nContext';
import { calculateNextReview, DEFAULT_CONFIG } from '../utils/spaced-repetition';
import { ReviewResult } from '../utils/spaced-repetition';
import { useAudio } from '../hooks/useAudio';

interface FlashCardProps {
  card: Flashcard | FlashcardMetadata;
  onRating?: (rating: 1 | 2 | 3 | 4 | 5, srsResult: ReviewResult) => void;
  showAnswer?: boolean; 
  isMetadataOnly?: boolean;
  isLoading?: boolean;
}

// Add type guard
const isFullFlashcard = (card: Flashcard | FlashcardMetadata): card is Flashcard => {
  return 'englishDefinition' in card;
};

const FlashCard = memo(({ card, onRating, showAnswer = false, isMetadataOnly = false, isLoading = false }: FlashCardProps) => {
  const { playSound } = useAudio();
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const { t } = useI18n();

  const ratingLabels: { [key: number]: string } = {
    1: '😟',
    2: '😐',
    3: '🙂', 
    4: '😊',
    5: '🎯'
  };

  useEffect(() => {
    setIsFlipped(false);
    setHasRated(false);
  }, [card]);

  const handleCardClick = () => {
    if (!isFlipped) {
      playSound('CARD_FLIP');
      setIsFlipped(true);
    }
  };

  const handleFlipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  const handleRating = (rating: 1 | 2 | 3 | 4 | 5) => {
    if (onRating && isFullFlashcard(card)) {
      playSound(rating >= 3 ? 'CORRECT_ANSWER' : 'WRONG_ANSWER');
      const srsResult = calculateNextReview(
        rating,
        card.difficulty,
        card.state || 'NEW',
        card.interval || 0,
        card.easeFactor || DEFAULT_CONFIG.startingEase
      );
      
      setHasRated(true);
      
      onRating(rating, srsResult);
    }
  };

  if (isLoading) {
    return <Box sx={{ 
      width: '100%',
      height: { xs: '450px', sm: '550px' },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Typography variant="h6" color="text.secondary">{t('study.loading')}</Typography>
    </Box>;
  }

  const renderContent = () => {
    if (isMetadataOnly || !isFullFlashcard(card)) {
      return (
        <>
          <Typography variant="h3">{card.word}</Typography>
          {card.categories?.length > 0 && (
            <Typography variant="body2" color="textSecondary">
              {card.categories[0]}
            </Typography>
          )}
          {isLoading && (
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          )}
        </>
      );
    }

    return (
      <>
        <Typography variant="h6">{card.partOfSpeech || ''}</Typography>
        <Typography variant="body1">{card.englishDefinition || ''}</Typography>
        {card.chineseTranslation && (
          <Typography variant="h5" color="primary">
            {card.chineseTranslation}
          </Typography>
        )}
        {isFullFlashcard(card) && card.exampleSentence && (
          <Box 
            sx={{ 
              mt: 3,
              p: 2,
              borderRadius: 2,
              backgroundColor: theme => theme.palette.mode === 'dark' 
                ? 'rgba(255,255,255,0.05)' 
                : 'rgba(0,0,0,0.02)',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                fontStyle: 'italic',
                color: 'text.secondary',
                '&::before': {
                  content: '"Example: "',
                  color: theme => theme.palette.primary.main,
                  fontWeight: 500,
                  fontStyle: 'normal'
                }
              }}
            >
              {card.exampleSentence}
            </Typography>
          </Box>
        )}
      </>
    );
  };

  return (
    <Box sx={{
      width: '100%', 
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      pt: { xs: 2, sm: 4 }
    }}>
      <Box sx={{
        width: '100%',
        height: { xs: '60vh', sm: '70vh' },
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 3, sm: 2 },
      }}>
        <Card sx={{ 
          height: { xs: 'calc(100% - 60px)', sm: '100%' },
          width: '100%',
          maxWidth: { xs: '95%', sm: '800px' },
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme => theme.palette.mode === 'dark' 
            ? 'linear-gradient(145deg, #1a1a1a 0%, #262626 100%)'
            : 'linear-gradient(145deg, #fefefe 0%, #ffffff 100%)',
          boxShadow: theme => `
            0 8px 32px ${theme.palette.primary.main}15,
            0 4px 8px rgba(0,0,0,0.1),
            0 16px 24px rgba(0,0,0,0.1)
          `,
          borderRadius: '24px',
          overflow: 'hidden',
          p: { xs: 1, sm: 3 },
          pb: { xs: 0.5, sm: 2 },
        }}>
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
              textAlign: 'center',
              cursor: 'pointer',
              opacity: isFlipped ? 0 : 1,
              transition: 'all 0.5s ease',
              transform: isFlipped ? 'translateY(-20px)' : 'translateY(0)',
              pointerEvents: isFlipped ? 'none' : 'auto',
            }}
          >
            <Typography 
              variant="h3" 
              noWrap
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.2rem' },
                fontWeight: 700,
                textAlign: 'center',
                maxWidth: '85vw',
                textTransform: 'capitalize',
                px: { xs: 1, sm: 2 },
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
          </Box>

          <Box sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 1, sm: 3 },
            pt: { xs: 1.5, sm: 4 },
            opacity: isFlipped ? 1 : 0,
            transition: 'all 0.5s ease',
            transform: isFlipped ? 'translateY(0)' : 'translateY(20px)',
            pointerEvents: isFlipped ? 'auto' : 'none',
            maxWidth: '90%',
            overflow: 'hidden',
            wordWrap: 'break-word',
            px: { xs: 2, sm: 3 },
          }}>
            <Box sx={{
              width: '100%',
              textAlign: 'center',
              padding: { xs: '0 12px', sm: '0 24px' },
              transition: 'all 0.5s ease',
              position: 'relative',
              mt: { xs: 4, sm: 5 }
            }}>
              <Typography 
                variant="h3"
                color="primary"
                sx={{ 
                  mb: 3,
                  fontWeight: 700,
                  fontSize: { xs: '2.5rem', sm: '3.2rem' },
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
                  fontSize: { xs: '1rem', sm: '1.1rem' }
                }}
              >
                {isFullFlashcard(card) ? card.partOfSpeech : ''}
              </Typography>
              
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ 
                  fontWeight: 500,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' }
                }}
              >
                {isFullFlashcard(card) ? capitalizeFirstWord(card.englishDefinition) : ''}
              </Typography>
              
              {isFullFlashcard(card) && card.chineseTranslation && (
                <Typography variant="h5" color="primary">
                  {card.chineseTranslation}
                </Typography>
              )}
              {isFullFlashcard(card) && card.exampleSentence && (
                <Box 
                  sx={{ 
                    mt: 3,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: theme => theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.05)' 
                      : 'rgba(0,0,0,0.02)',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontStyle: 'italic',
                      color: 'text.secondary',
                      '&::before': {
                        content: '"Example: "',
                        color: theme => theme.palette.primary.main,
                        fontWeight: 500,
                        fontStyle: 'normal'
                      }
                    }}
                  >
                    {card.exampleSentence}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Card>

        {!isFlipped && isMobile && (
          <Button
            variant="contained"
            size="large"
            onClick={handleFlipClick}
            sx={{
              width: 'auto',
              minWidth: '200px',
              maxWidth: '90%',
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'normal',
              height: 'auto',
              py: 1.5
            }}
          >
            {t('study.controls.showAnswer')}
          </Button>
        )}

        {onRating && isFlipped && (
          <Box sx={{ 
            display: 'flex',
            gap: { xs: 0.5, sm: 1 },
            maxWidth: '80vw',
            mx: 'auto',
            mt: { xs: 0.5, sm: 1 },
            '& .MuiButton-root': {
              flex: 1,
              minHeight: { xs: '36px', sm: '44px' },
              minWidth: { xs: '40px', sm: 'auto' },
              fontSize: { xs: '0.75rem', sm: '1rem' },
              p: { xs: 0.5, sm: 2 },
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              '& .emoji': {
                fontSize: { xs: '1rem', sm: '1.4rem' },
                display: 'block',
                mb: { xs: 0.25, sm: 1 }
              },
              '& .label': {
                fontSize: { xs: '0.65rem', sm: '0.85rem' },
                opacity: 0.9,
                lineHeight: { xs: 1, sm: 1.2 }
              },
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
                  onClick={() => handleRating(rating as 1 | 2 | 3 | 4 | 5)}
                  disabled={hasRated}
                  variant="contained"
                  color={rating >= 4 ? 'success' : rating >= 3 ? 'primary' : 'error'}
                  sx={{
                    py: { xs: 0.25, sm: 1.5 },
                    px: { xs: 0.5, sm: 2 },
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <span className="emoji">{ratingLabels[rating]}</span>
                  {!isSmallScreen && (
                    <span className="label">
                      {rating === 1 ? 'Again' :
                       rating === 2 ? 'Hard' :
                       rating === 3 ? 'Good' :
                       rating === 4 ? 'Easy' :
                       'Perfect'}
                    </span>
                  )}
                </Button>
              </Tooltip>
            ))}
          </Box>
        )}

        {isFlipped && (
          <Button
            variant={isMobile ? "contained" : "outlined"}
            size="large"
            onClick={handleFlipClick}
            sx={{
              width: '60%',
              maxWidth: '480px',
              position: 'relative',
              mt: { xs: 1, sm: 2 },
              opacity: isFlipped ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          >
            {t('study.controls.hideAnswer')}
          </Button>
        )}
      </Box>
    </Box>
  );
});

export default FlashCard;
