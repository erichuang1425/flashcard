import React, { useState, useEffect } from 'react';
import { Box, Container, Toolbar, Paper, useMediaQuery, useTheme, IconButton, Collapse, Tooltip } from '@mui/material';
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
  const { focusMode, toggleFocusMode } = useFocusMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 900);
  const [showGamePanel, setShowGamePanel] = useState(true);

  const toggleGamePanel = () => {
    setShowGamePanel(!showGamePanel);
    setIsPanelCollapsed(false);
  };
  
  // Auto collapse panel on small screens
  useEffect(() => {
    const handleResize = () => {
      const isSmall = window.innerWidth < 900;
      setIsSmallScreen(isSmall);
      if (isSmall) setIsPanelCollapsed(true);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: focusMode ? 'action.hover' : 'background.default',
      transition: 'all 0.3s ease'
    }}>
      <NavBar onTogglePanel={toggleGamePanel} showGamePanel={showGamePanel} focusMode={focusMode} onFocusChange={toggleFocusMode} />
      <Toolbar />
      
      <Box sx={{ 
        display: 'flex', 
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        justifyContent: 'center', // Center the content
        pb: { 
          xs: showGamePanel ? '0' : 0, // Remove conditional padding
          md: 0 
        },
        pr: { 
          xs: 0, 
          md: !focusMode && showGamePanel ? (isPanelCollapsed ? '48px' : '324px') : 0 
        },
        transition: 'padding 0.3s ease'
      }}>
        <Container maxWidth="lg" sx={{ flex: { xs: 1, md: 'none' } /* Remove flex:1 on desktop */ }}>
          {children}
        </Container>

        {!focusMode && showGamePanel && (
          <>
            <IconButton
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              size="small"
              sx={{
                position: 'fixed',
                top: isSmallScreen ? 'auto' : '50%',
                bottom: isSmallScreen ? '16px' : 'auto',
                right: isSmallScreen ? '50%' : '324px',
                transform: isSmallScreen 
                  ? 'translateX(50%)' 
                  : 'translate(50%, -50%)',
                zIndex: 1201,
                backgroundColor: theme => theme.palette.mode === 'dark' ? 'grey.800' : 'background.paper',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                border: '1px solid',
                borderColor: 'divider',
                width: '32px',
                height: '32px',
                transition: 'all 0.3s ease',
                ...(isPanelCollapsed && {
                  right: isSmallScreen ? '50%' : '24px',
                }),
                '&:hover': {
                  backgroundColor: theme => theme.palette.mode === 'dark' ? 'grey.700' : 'grey.100',
                },
              }}
            >
              {isSmallScreen 
                ? (isPanelCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />)
                : (isPanelCollapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />)
              }
            </IconButton>

            <Paper
              elevation={2}
              sx={{
                position: 'fixed',
                visibility: isPanelCollapsed ? 'hidden' : 'visible',
                top: { xs: 'auto', md: 76 },
                bottom: 0,
                right: 0,
                height: { 
                  xs: isPanelCollapsed ? '48px' : '300px', // Keep minimum height when collapsed
                  md: isPanelCollapsed ? 0 : 'calc(100vh - 88px)'
                },
                width: { 
                  xs: '100%',
                  md: isPanelCollapsed ? 0 : '300px'
                },
                maxWidth: { xs: '100%', md: '324px' },
                transform: {
                  xs: `translateY(${isPanelCollapsed ? 'calc(100% - 48px)' : '0'})`, // Keep handle visible
                  md: `translateX(${isPanelCollapsed ? '100%' : '0'})`
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                borderRadius: { 
                  xs: '12px 12px 0 0', // Always show border radius on mobile
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
                backdropFilter: 'blur(10px)'
              }}
            >
              <Box 
                sx={{ 
                  display: { xs: 'flex', md: 'none' },
                  height: '48px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: 1,
                  borderColor: 'divider',
                  cursor: 'pointer'
                }}
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              >
                {isPanelCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </Box>
              
              <Collapse 
                in={!isPanelCollapsed}
                sx={{
                  height: { xs: 'calc(100% - 48px)', md: '100%' } // Account for handle height
                }}
              >
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                  {levelSystem && <LevelProgress />}
                  <PomodoroTimer compact={isPanelCollapsed} />
                </Box>
              </Collapse>
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
};
