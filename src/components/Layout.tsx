import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Container, Toolbar, Paper, useMediaQuery, useTheme, IconButton, 
  Collapse, Tooltip, SwipeableDrawer, Fab, Typography, Slider, FormControlLabel, Switch, Button 
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import { NavBar } from './NavBar';
import { LevelProgress } from './gamification/LevelProgress';
import { useGamification } from '../context/GamificationContext';
import { useFocusMode } from '../context/FocusModeContext';
import { PomodoroTimer } from './PomodoroTimer';
import { useLocation } from 'react-router-dom';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useI18n } from '../i18n/I18nContext';
import { useReadingMode } from '../context/ReadingModeContext';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { getRandomArticle } from '../services/articleService';
import { logger } from '../services/logging';
import { useAuth } from '../context/AuthContext';
import DarkModeIcon from '@mui/icons-material/DarkMode'; 

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useI18n();
  const { levelSystem } = useGamification();
  const { focusMode, toggleFocusMode } = useFocusMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 900);
  const [showGamePanel, setShowGamePanel] = useState(true);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [autoHide, setAutoHide] = useState(false);
  const location = useLocation();
  const [mobileGamePanelOpen, setMobileGamePanelOpen] = useState(false);
  const { preferences, setPreferences } = useUserPreferences();
  const { currentArticle, setCurrentArticle } = useReadingMode();
  const { user } = useAuth();

  const toggleGamePanel = () => {
    if (isMobile) {
      setShowGamePanel(!showGamePanel); 
    } else {
      setShowGamePanel(!showGamePanel);
      setIsPanelCollapsed(false);
    }
  };

  const toggleMobileGamePanel = () => {
    setMobileGamePanelOpen(!mobileGamePanelOpen);
  };
  
  const updateReadingSettings = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      readingSettings: {
        ...prev.readingSettings,
        [key]: value
      }
    }));
  };

  const handleRandomArticle = async () => {
    if (!user) return;
    try {
      const article = await getRandomArticle(user.uid);
      if (article) {
        setCurrentArticle(article);
        setMobileGamePanelOpen(false);
      }
    } catch (err) {
      logger.error('Failed to get random article', err as Error);
    }
  };


  useEffect(() => {
    const handleResize = () => {
      const isSmall = window.innerWidth < 900;
      setIsSmallScreen(isSmall);
      if (isSmall) setIsPanelCollapsed(true);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-hide panel on study page
  useEffect(() => {
    setAutoHide(location.pathname === '/study');
  }, [location]);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: focusMode ? 'action.hover' : 'background.default',
      transition: 'all 0.3s ease'
    }}>
      {/* Only show NavBar if user is logged in */}
      {user && (
        <NavBar 
          onTogglePanel={toggleGamePanel} 
          showGamePanel={showGamePanel && !!user} 
          focusMode={focusMode} 
          onFocusChange={toggleFocusMode} 
        />
      )}
      
      <Box sx={{ 
        display: 'flex', 
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        justifyContent: 'center',
        pt: user ? { xs: 8, sm: 8 } : 0,
        pb: { 
          xs: showGamePanel && !!user ? '64px' : 0, 
          md: 0 
        },
        pr: { 
          xs: 0, 
          md: !focusMode && showGamePanel && !!user ? (isPanelCollapsed ? '48px' : '324px') : 0 
        },
        transition: 'padding 0.3s ease'
      }}>
        <Container maxWidth="lg" sx={{ flex: { xs: 1, md: 'none' } }}>
          {children}
        </Container>

        {!focusMode && showGamePanel && user && (
          <>
            {/* Desktop Panel */}
            {!isMobile && (
              <>
                <IconButton
                  onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                  size="small"
                  sx={{
                    position: 'fixed',
                    top: '50%',
                    right: '324px',
                    transform: 'translate(50%, -50%)',
                    zIndex: 1201,
                    backgroundColor: theme => theme.palette.mode === 'dark' ? 'grey.800' : 'background.paper',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    border: '1px solid',
                    borderColor: 'divider',
                    width: '32px',
                    height: '32px',
                    transition: 'all 0.3s ease',
                    ...(isPanelCollapsed && {
                      right: '24px',
                    }),
                    '&:hover': {
                      backgroundColor: theme => theme.palette.mode === 'dark' ? 'grey.700' : 'grey.100',
                    },
                  }}
                >
                  {isPanelCollapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </IconButton>

                <Paper
                  elevation={2}
                  sx={{
                    position: 'fixed',
                    visibility: isPanelCollapsed ? 'hidden' : 'visible',
                    top: 76,
                    right: 0,
                    height: 'calc(100vh - 88px)',
                    width: isPanelCollapsed ? 0 : '300px',
                    maxWidth: '324px',
                    transform: `translateX(${isPanelCollapsed ? '100%' : '0'})`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    '& .pomodoro-timer': {
                      maxWidth: '100%',
                      margin: '0 auto'
                    }
                  }}
                >
                  <Box sx={{ 
                    flex: 1,
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    p: 2
                  }}>
                    {levelSystem && <LevelProgress />}
                    <PomodoroTimer />
                  </Box>
                </Paper>
              </>
            )}

            {/* Mobile Panel */}
            {isMobile && (
              <>
                <Fab
                  size="small"
                  color="primary"
                  onClick={toggleMobileGamePanel}
                  sx={{
                    position: 'fixed',
                    right: 16,
                    bottom: 16,
                    zIndex: 1200,
                    transform: mobileGamePanelOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.3s ease'
                  }}
                >
                  <KeyboardArrowUpIcon />
                </Fab>

                <SwipeableDrawer
                  anchor="bottom"
                  open={mobileGamePanelOpen}
                  onClose={() => setMobileGamePanelOpen(false)}
                  onOpen={() => setMobileGamePanelOpen(true)}
                  disableSwipeToOpen={false}
                  swipeAreaWidth={30}
                  ModalProps={{
                    keepMounted: true
                  }}
                  PaperProps={{
                    sx: {
                      height: 'auto',
                      maxHeight: '85vh',
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      overflow: 'visible',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 8,
                        left: '50%',
                        width: 40,
                        height: 4,
                        backgroundColor: 'grey.300',
                        borderRadius: 2,
                        transform: 'translateX(-50%)'
                      }
                    }
                  }}
                >
                  <Box sx={{ 
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    mt: 2
                  }}>

                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        bgcolor: 'background.default',
                        borderRadius: 2
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={focusMode}
                            onChange={toggleFocusMode}
                            name="focusMode"
                            color="primary"
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DarkModeIcon fontSize="small" />
                            <Typography variant="body2">{t('common.focusMode')}</Typography>
                          </Box>
                        }
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          m: 0
                        }}
                      />
                    </Paper>

                    {levelSystem && (
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'background.default',
                          borderRadius: 2
                        }}
                      >
                        <LevelProgress compact />
                      </Paper>
                    )}
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        bgcolor: 'background.default',
                        borderRadius: 2
                      }}
                    >
                      <PomodoroTimer compact />
                    </Paper>
                    

                    {location.pathname === '/reading' && currentArticle && (
                      <>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            bgcolor: 'background.default', 
                            borderRadius: 2
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 2
                          }}>
                            <Button
                              variant="contained"
                              onClick={handleRandomArticle}
                              startIcon={<ShuffleIcon />}
                              fullWidth
                            >
                              {t('reading.actions.random')}
                            </Button>
                          </Box>
                        </Paper>
                      </>
                    )}
                  </Box>
                </SwipeableDrawer>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};
