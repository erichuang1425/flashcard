import React, { useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, useMediaQuery, useTheme, alpha } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TimerIcon from '@mui/icons-material/Timer';
import { useSettings } from '../context/SettingsContext';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useI18n } from '../i18n/I18nContext';

interface PomodoroTimerProps {
  compact?: boolean;
  miniature?: boolean; // Add new prop for miniature view
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ 
  compact = false,
  miniature = false 
}) => {
  const { t } = useI18n();
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

  return (
    <Paper 
      className="pomodoro-timer"
      sx={{ 
        p: miniature ? 1 : compact ? 1 : { xs: 2, sm: 3 }, 
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: miniature ? 'auto' : compact ? 'auto' : { xs: '180px', sm: 'auto' },
        backgroundColor: theme => pomodoro.isActive 
          ? alpha(theme.palette.primary.main, miniature ? 0.1 : 0.05) 
          : 'background.paper',
        transition: 'all 0.3s ease',
        borderRadius: miniature ? 1 : 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: miniature ? 0.5 : 2,
        cursor: miniature ? 'pointer' : 'default',
        ...(miniature && {
          '& .MuiTypography-root': {
            fontSize: '0.75rem'
          },
          '& .MuiCircularProgress-root': {
            width: '36px !important',
            height: '36px !important'
          },
          '& .MuiButton-root': {
            minWidth: 'unset',
            padding: '4px 8px'
          }
        })
      }}
    >
      {!compact && !miniature && (
        <Typography variant="h6">
          {pomodoro.isBreak ? t('study.pomodoro.break') : t('study.pomodoro.focus')}
        </Typography>
      )}
      
      <Box sx={{ 
        position: 'relative', 
        display: 'inline-flex',
        transform: miniature ? 'scale(0.5)' : compact ? 'scale(0.8)' : 'none',
        m: miniature ? '-12px' : compact ? '-8px' : 0
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

      {!miniature && (
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
            {pomodoro.isActive ? t('study.pomodoro.pause') : t('study.pomodoro.start')}
          </Button>
          <Button
            variant="outlined"
            onClick={pomodoro.reset}
            startIcon={<RestartAltIcon />}
            size={compact ? "small" : "medium"}
          >
            {t('study.pomodoro.reset')}
          </Button>
        </Box>
      )}
    </Paper>
  );
};
