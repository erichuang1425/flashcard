import React, { useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, SpeedDial, SpeedDialAction, useMediaQuery, useTheme, alpha } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TimerIcon from '@mui/icons-material/Timer';
import { useSettings } from '../context/SettingsContext';
import { useUserPreferences } from '../hooks/useUserPreferences';

interface PomodoroTimerProps {
  compact?: boolean;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ compact = false }) => {
  const { pomodoro } = useSettings();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { preferences } = useUserPreferences();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft: number, total: number) => 
    ((total - timeLeft) / total) * 100;

  const totalTime = pomodoro.isBreak ? 5 * 60 : 25 * 60;

  const mobileActions = [
    { icon: pomodoro.isActive ? <PauseIcon /> : <PlayArrowIcon />, name: pomodoro.isActive ? 'Pause' : 'Start', action: pomodoro.isActive ? pomodoro.pause : pomodoro.start },
    { icon: <RestartAltIcon />, name: 'Reset', action: pomodoro.reset }
  ];

  const renderMobileControls = () => (
    <SpeedDial
      ariaLabel="Pomodoro Controls"
      sx={{ position: 'fixed', bottom: 16, right: 16 }}
      icon={<TimerIcon />}
    >
      {mobileActions.map((action) => (
        <SpeedDialAction
          key={action.name}
          icon={action.icon}
          tooltipTitle={action.name}
          onClick={action.action}
        />
      ))}
    </SpeedDial>
  );

  return (
    <Paper sx={{ 
      p: compact ? 1 : { xs: 2, sm: 3 }, 
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      minHeight: compact ? 'auto' : { xs: '200px', sm: 'auto' },
      backgroundColor: theme => pomodoro.isActive ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
      transition: 'all 0.3s ease',
      borderRadius: 2
    }}>
      {!compact && (
        <Typography variant="h6" gutterBottom>
          {pomodoro.isBreak ? 'Break Time' : 'Focus Time'}
        </Typography>
      )}
      
      <Box sx={{ 
        position: 'relative', 
        display: 'inline-flex',
        transform: compact ? 'scale(0.8)' : 'none'
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

      {!isMobile && !compact ? (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Button
            variant="contained"
            color={pomodoro.isBreak ? "success" : "primary"}
            onClick={pomodoro.isActive ? pomodoro.pause : pomodoro.start}
            startIcon={pomodoro.isActive ? <PauseIcon /> : <PlayArrowIcon />}
          >
            {pomodoro.isActive ? 'Pause' : 'Start'}
          </Button>
          <Button
            variant="outlined"
            onClick={pomodoro.reset}
            startIcon={<RestartAltIcon />}
          >
            Reset
          </Button>
        </Box>
      ) : renderMobileControls()}
    </Paper>
  );
};
