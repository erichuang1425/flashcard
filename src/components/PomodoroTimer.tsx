import React, { useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, useMediaQuery, useTheme, alpha } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TimerIcon from '@mui/icons-material/Timer';
import { usePomodoro } from '../context/PomodoroContext';
import { useLanguage } from '../i18n/LanguageContext';

interface PomodoroTimerProps {
  compact?: boolean;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ compact = false }) => {
  const pomodoro = usePomodoro();
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft: number, total: number) => 
    ((total - timeLeft) / total) * 100;

  const totalTime = pomodoro.isBreak ? pomodoro.breakDuration : pomodoro.workDuration;

  return (
    <Paper sx={{ 
      p: compact ? 1 : { xs: 2, sm: 3 }, 
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      minHeight: compact ? 'auto' : { xs: '180px', sm: 'auto' },
      backgroundColor: theme => pomodoro.isActive ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
      transition: 'all 0.3s ease',
      borderRadius: 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2
    }}>
      {!compact && (
        <Typography variant="h6">
          {pomodoro.isBreak ? t('pomodoro.breakTime') : t('pomodoro.focusTime')}
        </Typography>
      )}
      
      <Box sx={{ 
        position: 'relative', 
        display: 'inline-flex',
        transform: compact ? 'scale(0.8)' : 'none',
        m: compact ? '-8px' : 0
      }}>
        <CircularProgress
          variant="determinate"
          value={progress(pomodoro.timeLeft, totalTime)}
          size={120}
          thickness={4}
          sx={{ color: pomodoro.isBreak ? 'success.main' : 'primary.main' }}
        />
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Typography variant="h4" component="div">
            {formatTime(pomodoro.timeLeft)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 1,
        width: '100%',
        mt: compact ? 0 : 1
      }}>
        <Button
          variant="contained"
          color={pomodoro.isBreak ? "success" : "primary"}
          onClick={pomodoro.isActive ? pomodoro.pause : pomodoro.start}
          startIcon={pomodoro.isActive ? <PauseIcon /> : <PlayArrowIcon />}
          size={compact ? "small" : "medium"}
        >
          {pomodoro.isActive ? t('pomodoro.pause') : t('pomodoro.start')}
        </Button>
        <Button
          variant="outlined"
          onClick={pomodoro.reset}
          startIcon={<RestartAltIcon />}
          size={compact ? "small" : "medium"}
        >
          {t('pomodoro.reset')}
        </Button>
      </Box>
    </Paper>
  );
};
