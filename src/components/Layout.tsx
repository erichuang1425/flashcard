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
  const { focusMode } = useFocusMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 900);
  
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
      <NavBar />
      <Toolbar />
      
      <Box sx={{ 
        display: 'flex', 
        flex: 1,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Main Content */}
        <Container
          maxWidth="lg"
          sx={{
            flex: 1,
            py: { xs: 2, sm: 3 },
            px: { xs: 1, sm: 2, md: 3 },
            mx: 'auto', // Center content
            width: {
              xs: '100%',
              sm: `calc(100% - ${isPanelCollapsed ? '48px' : '0px'})`,
              md: `calc(100% - ${!focusMode && !isPanelCollapsed ? '300px' : '48px'})`
            },
            transition: 'all 0.3s ease',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            opacity: focusMode ? 0.97 : 1,
            filter: focusMode ? 'grayscale(0.2)' : 'none',
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.palette.primary.main} transparent`,
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.primary.main,
              borderRadius: '3px',
            }
          }}
        >
          {children}
        </Container>

        {/* Collapsible Side Panel */}
        {!focusMode && (
          <Paper
            elevation={2}
            sx={{
              position: 'fixed',
              top: { xs: 'auto', md: 76 },
              bottom: { xs: 0, md: 'auto' },
              right: 0,
              height: { 
                xs: isPanelCollapsed ? '48px' : '300px',
                md: 'calc(100vh - 76px)' 
              },
              width: { 
                xs: '100%',
                md: isPanelCollapsed ? '48px' : '300px'
              },
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              borderRadius: { 
                xs: isPanelCollapsed ? 0 : '12px 12px 0 0',
                md: 0 
              },
              borderTop: { xs: 1, md: 0 },
              borderLeft: { xs: 0, md: 1 },
              borderColor: 'divider',
              zIndex: 1200,
              overflow: 'hidden'
            }}
          >
            <IconButton
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              sx={{
                position: 'absolute',
                [isSmallScreen ? 'top' : 'left']: 0,
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
                zIndex: 1
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
                overflowY: 'auto',
                overflowX: 'hidden',
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
    </Box>
  );
};
