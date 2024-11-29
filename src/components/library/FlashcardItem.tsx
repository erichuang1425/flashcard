import React, { useState, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Fade,
  useTheme,
  Button
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PreviewIcon from '@mui/icons-material/Preview';
import type { FlashcardMetadata } from '../../types';

interface FlashcardItemProps {
  card: FlashcardMetadata;
  onView?: (card: FlashcardMetadata) => void;
  onEdit?: (card: FlashcardMetadata) => void;
  onDelete?: (card: FlashcardMetadata) => void;
  isMobile?: boolean;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = React.memo(({
  card,
  onView,
  onEdit,
  onDelete,
  isMobile
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const handleView = useCallback(() => onView?.(card), [card, onView]);
  const handleEdit = useCallback(() => onEdit?.(card), [card, onEdit]);
  const handleDelete = useCallback(() => onDelete?.(card), [card, onDelete]);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.action-buttons')) {
      onView?.(card);
    }
  };

  return (
    <Card
      ref={cardRef}
      elevation={isHovered ? 6 : 1}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onClick={handleCardClick}
      sx={{
        height: { xs: '180px', sm: '200px' },
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: theme => theme.transitions.create(
          ['transform', 'box-shadow', 'background-color'],
          { duration: theme.transitions.duration.shorter }
        ),
        position: 'relative',
        '&:hover': {
          transform: { xs: 'none', sm: 'translateY(-8px)' },
          boxShadow: { 
            xs: 'none', 
            sm: theme => `0 16px 32px ${theme.palette.primary.main}25`
          },
        },
        '&:active': {
          transform: 'scale(0.98)',
          transition: 'transform 0.1s'
        },
        borderRadius: '16px',
        overflow: 'hidden',
        background: theme => `linear-gradient(145deg, 
          ${theme.palette.background.paper} 0%, 
          ${theme.palette.mode === 'dark' 
            ? 'rgba(255,255,255,0.05)' 
            : 'rgba(0,0,0,0.02)'
          } 100%)`
      }}
    >
      <CardContent sx={{ 
        flexGrow: 1, 
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        p: 2,
        '&:last-child': { pb: 2 }
      }}>
        <Box sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Typography 
            variant="h5"
            sx={{ 
              fontSize: '180%',
              fontWeight: 700,
              textTransform: 'capitalize',
              lineHeight: 1.2,
              textAlign: 'center',
              color: theme => theme.palette.mode === 'dark' 
                ? theme.palette.primary.light 
                : theme.palette.primary.main,
              mb: 2,
              transition: theme.transitions.create(
                ['transform', 'font-size'],
                { duration: theme.transitions.duration.standard }
              ),
              background: theme => `linear-gradient(45deg, 
                ${theme.palette.primary.main}, 
                ${theme.palette.primary.dark}
              )`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              transform: isHovered ? 'scale(1.1)' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              maxWidth: '90%'
            }}
          >
            {card.word}
          </Typography>

          {Array.isArray(card.categories) && card.categories.length > 0 && (
            <Box sx={{ 
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
              justifyContent: 'center',
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16
            }}>
              {card.categories.slice(0, 3).map((category, index) => (
                <Typography
                  key={index}
                  variant="caption"
                  sx={{
                    backgroundColor: theme => theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.1)'
                      : theme.palette.primary.main + '15',
                    color: 'inherit',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    lineHeight: 1.2,
                    opacity: isHovered ? 0.7 : 1,
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  {category}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </CardContent>

      <Fade in={isHovered && !isMobile}>
        <Box
          className="action-buttons"
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(0,0,0,0.8)' 
              : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'space-around',
            p: 1,
            borderTop: 1,
            borderColor: 'divider'
          }}
        >
          <IconButton size="small" onClick={handleEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Fade>

      {isMobile && (
        <Box
          className="action-buttons"
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            borderTop: 1,
            borderColor: 'divider',
            py: 1,
            px: 2,
            backgroundColor: theme.palette.background.paper
          }}
        >
          <Button
            startIcon={<EditIcon />}
            onClick={handleEdit}
            size="small"
            sx={{ flex: 1, mx: 1 }}
          >
            Edit
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            color="error"
            size="small"
            sx={{ flex: 1, ml: 1 }}
          >
            Delete
          </Button>
        </Box>
      )}
    </Card>
  );
});
