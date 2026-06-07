import React, { useState, useEffect } from 'react';
import { Box, Paper, Drawer, Typography, useMediaQuery, useTheme, IconButton, Collapse, Tooltip } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { NavBar } from './NavBar';
import { LevelProgress } from './gamification/LevelProgress';
import { useGamification } from '../context/GamificationContext';
import { useFocusMode } from '../context/FocusModeContext';
import { PomodoroTimer } from './PomodoroTimer';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { levelSystem } = useGamification();
  const { focusMode } = useFocusMode();
  const theme = useTheme();
  // Below `md` the fixed side panel is hidden; Level/Pomodoro move into an
  // on-demand bottom sheet opened from the NavBar so they no longer crowd the
  // phone viewport (and the content keeps its full height).
  const isPanelHidden = useMediaQuery(theme.breakpoints.down('md'));
  const [statsOpen, setStatsOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 900);
  
  // Auto collapse panel on small screens
  useEffect(() => {
    const applyBreakpoint = () => {
      const isSmall = window.innerWidth < 900;
      setIsSmallScreen(isSmall);
      if (isSmall) setIsPanelCollapsed(true);
    };

    // Throttle the resize burst (address-bar show/hide thrash) to one update
    // per animation frame.
    let frame = 0;
    const handleResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        applyBreakpoint();
      });
    };

    window.addEventListener('resize', handleResize);
    applyBreakpoint(); // Initial check
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <Box sx={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: focusMode ? 'action.hover' : 'background.default',
      transition: 'all 0.3s ease'
    }}>
      {/* NavBar already renders its own offset spacer below the fixed AppBar;
          a second spacer here previously left ~128px of dead space at the top. */}
      <NavBar onOpenStats={() => setStatsOpen(true)} />

      <Box sx={{
        display: 'flex',
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        // No mobile overlay panel anymore (it lives in the bottom sheet), so the
        // large compensating bottom padding is gone; only desktop reserves room.
        pb: 0,
        pr: { xs: 0, md: !focusMode && !isPanelCollapsed ? '324px' : '64px' }, // Add padding for panel
        transition: 'all 0.3s ease'
      }}>
        {/* Main Content — each page owns its own max-width/padding via its own
            Container; this Box is just the scroll region + side-panel offset. */}
        <Box
          sx={{
            flex: 1,
            py: { xs: 2, sm: 3 },
            mx: 'auto',
            width: {
              xs: '100%',
              md: `calc(100% - ${!focusMode && !isPanelCollapsed ? '324px' : '64px'})` // Add extra spacing
            },
            transition: 'all 0.3s ease',
            height: 'calc(100dvh - 64px)',
            overflowY: 'auto',
            opacity: focusMode ? 0.97 : 1,
            filter: focusMode ? 'grayscale(0.2)' : 'none',
            scrollbarWidth: 'none', // Hide scrollbar
            msOverflowStyle: 'none', // Hide scrollbar IE/Edge
            '&::-webkit-scrollbar': {
              display: 'none', // Hide scrollbar Chrome/Safari/Opera
            },
            '&:hover': {
              '&::-webkit-scrollbar': {
                display: 'block',
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
                mx: 2
              },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.primary.main,
                borderRadius: '3px',
                '&:hover': {
                  background: theme.palette.primary.dark,
                }
              }
            }
          }}
        >
          {children}
        </Box>

        {/* Collapsible Side Panel */}
        {!focusMode && (
          <Paper
            elevation={2}
            sx={{
              position: 'fixed',
              top: { xs: 'auto', md: 76 },
              bottom: { xs: 0, md: 'auto' },
              right: { xs: 0, md: 12 }, // Add right margin on desktop
              height: { 
                xs: isPanelCollapsed ? '48px' : '300px',
                md: 'calc(100dvh - 88px)' // Adjust height to account for margins
              },
              width: { 
                xs: '100%',
                md: isPanelCollapsed ? '48px' : '300px'
              },
              maxWidth: { xs: '100%', md: '324px' },
              transition: 'all 0.3s ease',
              // Hidden below `md`; the bottom sheet covers small screens.
              display: { xs: 'none', md: 'flex' },
              flexDirection: { xs: 'column', md: 'row' },
              borderRadius: { 
                xs: isPanelCollapsed ? 0 : '12px 12px 0 0',
                md: '12px' 
              },
              borderTop: { xs: 1, md: 0 },
              borderColor: 'divider',
              zIndex: 1200,
              overflow: 'hidden',
              boxShadow: theme => isSmallScreen 
                ? 'none'
                : `0 4px 20px ${theme.palette.mode === 'dark' 
                    ? 'rgba(0,0,0,0.4)' 
                    : 'rgba(0,0,0,0.15)'}`,
              background: theme => theme.palette.mode === 'dark'
                ? 'rgba(30,30,30,0.95)'
                : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              transform: { xs: 'none', md: isPanelCollapsed ? 'translateX(calc(100% - 48px))' : 'none' }
            }}
          >
            <IconButton
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              sx={{
                position: 'absolute',
                [isSmallScreen ? 'top' : 'left']: isSmallScreen ? 0 : '-20px',
                [isSmallScreen ? 'left' : 'top']: '50%',
                transform: isSmallScreen 
                  ? 'translateX(-50%) translateY(-50%)'
                  : 'translateY(-50%) translateX(-50%)',
                backgroundColor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                zIndex: 2
              }}
            >
              {isSmallScreen 
                ? (isPanelCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />)
                : (isPanelCollapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />)
              }
            </IconButton>

            <Collapse
              in={!isPanelCollapsed}
              orientation={isSmallScreen ? 'vertical' : 'horizontal'}
              sx={{ 
                width: '100%',
                height: '100%',
                overflow: 'hidden', // Hide scrollbars by default
                '&:hover': {
                  overflowY: 'auto', // Show on hover
                },
                scrollbarWidth: 'thin',
                scrollbarColor: `${theme.palette.primary.main} transparent`,
                '&::-webkit-scrollbar': {
                  width: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: theme.palette.primary.main,
                  borderRadius: '2px',
                }
              }}
            >
              <Box sx={{ 
                p: 2, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2,
                height: '100%'
              }}>
                {levelSystem && <LevelProgress />}
                <PomodoroTimer compact={isPanelCollapsed} />
              </Box>
            </Collapse>
          </Paper>
        )}
      </Box>

      {/* Mobile/tablet on-demand "progress & timer" bottom sheet. Replaces the
          old fixed bottom strip so it no longer steals viewport height. */}
      <Drawer
        anchor="bottom"
        open={isPanelHidden && statsOpen}
        onClose={() => setStatsOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            borderRadius: '16px 16px 0 0',
            maxHeight: '85dvh',
            pb: 'env(safe-area-inset-bottom)',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Progress & Timer
          </Typography>
          {levelSystem && <LevelProgress />}
          <PomodoroTimer />
        </Box>
      </Drawer>
    </Box>
  );
};
