import React from 'react';
import { Box, Typography, LinearProgress, Paper, Tooltip, Zoom } from '@mui/material';
import { useGamification } from '../../context/GamificationContext';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export const LevelProgress: React.FC = () => {
  const { levelSystem } = useGamification();
  
  if (!levelSystem) return null;
  
  const progress = (levelSystem.currentXP / levelSystem.requiredXP) * 100;
  const nextLevel = levelSystem.currentLevel + 1;

  return (
    <Zoom in>
      <Paper sx={{ 
        p: 2,
        backdropFilter: 'blur(10px)',
        background: theme => 
          theme.palette.mode === 'dark' 
            ? 'rgba(0,0,0,0.6)' 
            : 'rgba(255,255,255,0.8)',
        border: '1px solid',
        borderColor: 'divider',
        minHeight: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <EmojiEventsIcon 
            color="primary" 
            sx={{ 
              mr: 1,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
                '100%': { transform: 'scale(1)' },
              }
            }} 
          />
          <Typography variant="h6">Level {levelSystem.currentLevel}</Typography>
        </Box>
        
        <Tooltip 
          title={`${levelSystem.requiredXP - levelSystem.currentXP} XP until Level ${nextLevel}`}
          arrow
          placement="top"
        >
          <Box sx={{ width: '100%' }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ 
                height: 8, 
                borderRadius: 4, 
                mb: 1,
                '& .MuiLinearProgress-bar': {
                  transition: 'transform 0.5s ease-out'
                }
              }}
            />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{levelSystem.currentXP} XP</span>
              <span>{levelSystem.requiredXP} XP</span>
            </Typography>
          </Box>
        </Tooltip>
      </Paper>
    </Zoom>
  );
};