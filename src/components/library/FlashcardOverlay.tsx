import React, { useState, useEffect } from 'react';
import { Portal, Box, IconButton, Typography, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Flashcard } from '../../types';
import { capitalizeFirstWord } from '../../utils/helpers';

interface FlashcardOverlayProps {
  card: Flashcard;
  onClose: () => void;
  sourceElement: HTMLElement | null;
}

export const FlashcardOverlay: React.FC<FlashcardOverlayProps> = ({
  card,
  onClose,
  sourceElement,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  return (
    <Portal>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1302,
          }}
        >
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          onClick={(e) => {
            e.stopPropagation();
            handleFlip(e);
          }}
          sx={{
            width: '90%',
            maxWidth: '800px',
            height: '70vh',
            position: 'relative',
            perspective: '1000px',
            cursor: 'pointer',
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              position: 'relative',
              transition: 'transform 0.6s',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                backgroundColor: theme.palette.background.paper,
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                boxShadow: theme.shadows[24],
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  fontSize: { xs: '2.5rem', sm: '3.2rem' },
                  fontWeight: 700,
                  textAlign: 'center',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textTransform: 'capitalize',
                  background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'float 3s ease-in-out infinite',
                  '@keyframes float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                  },
                }}
              >
                {card.word}
              </Typography>
            </Box>

            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                backgroundColor: theme.palette.background.paper,
                borderRadius: '24px',
                transform: 'rotateY(180deg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                boxShadow: theme.shadows[24],
                overflowY: 'auto',
              }}
            >
              <Box sx={{ 
                width: '100%',
                maxWidth: '600px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Box sx={{ width: '100%', textAlign: 'center' }}>
                  <Typography
                    variant="h3"
                    color="primary"
                    sx={{
                      mb: 3,
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      fontSize: { xs: '2.5rem', sm: '3.2rem' },
                    }}
                  >
                    {card.word}
                  </Typography>
                  
                  {card.partOfSpeech && (
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{
                        fontStyle: 'italic',
                        mb: 2,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                      }}
                    >
                      {card.partOfSpeech}
                    </Typography>
                  )}

                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{
                      fontWeight: 500,
                      fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    }}
                  >
                    {capitalizeFirstWord(card.englishDefinition)}
                  </Typography>

                  {card.chineseTranslation && (
                    <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                      {card.chineseTranslation}
                    </Typography>
                  )}

                  {card.exampleSentence && (
                    <Box
                      sx={{
                        mt: 3,
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: theme => theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.02)',
                        border: '1px solid',
                        borderColor: 'divider',
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
                            fontStyle: 'normal',
                          },
                        }}
                      >
                        {card.exampleSentence}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Portal>
  );
};