import React, { useState } from 'react';
import { Box, Paper, Drawer, Typography, useMediaQuery, useTheme, IconButton, Collapse, Tooltip } from '@mui/material';
import { useLocation } from 'react-router-dom';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { NavBar } from './NavBar';
import { LevelProgress } from './gamification/LevelProgress';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { useFocusMode } from '../context/FocusModeContext';
import { PomodoroTimer } from './PomodoroTimer';
import { dvhMinHeight, dvhHeight, dvhMaxHeight } from '../utils/viewport';
import { useLanguage } from '../i18n/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { levelSystem } = useGamification();
  const { focusMode } = useFocusMode();
  const theme = useTheme();
  const location = useLocation();
  // The Study page renders its own 300px progress sidebar, so Layout's fixed
  // Level/Pomodoro panel would stack beside it and squeeze the card to a narrow
  // column at `md`. Suppress the desktop panel (and its width reservation) on
  // Study; Level/Pomodoro stay reachable on mobile via the bottom sheet.
  const isStudyRoute = location.pathname === '/study';
  const showSidePanel = !focusMode && !isStudyRoute;
  // Below `md` the fixed side panel is hidden; Level/Pomodoro move into an
  // on-demand bottom sheet opened from the NavBar so they no longer crowd the
  // phone viewport (and the content keeps its full height).
  const isPanelHidden = useMediaQuery(theme.breakpoints.down('md'));
  const [statsOpen, setStatsOpen] = useState(false);
  // Desktop-only side-panel collapse toggle. The panel is hidden below `md`
  // (the bottom sheet covers small screens), so no width watcher is needed and
  // collapse is driven purely by this user toggle.
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // The app chrome (NavBar, side panel, progress/timer sheet) belongs to the
  // signed-in experience. Visitors on /login and /register get a bare canvas —
  // those pages center themselves and bring their own language switcher.
  if (!user) {
    return (
      <Box
        sx={{
          ...dvhMinHeight(),
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.default',
        }}
      >
        {children}
      </Box>
    );
  }

  return (
    <Box sx={{
      ...dvhMinHeight(),
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
        pr: { xs: 0, md: showSidePanel ? (!isPanelCollapsed ? '324px' : '64px') : 0 }, // Reserve room only when the panel is shown
        transition: 'all 0.3s ease'
      }}>
        {/* Main Content — each page owns its own max-width/padding via its own
            Container; this Box is just the scroll region + side-panel offset. */}
        <Box
          sx={{
            flex: 1,
            py: { xs: 2, sm: 3 },
            // The parent flex row already reserves the side-panel column via its
            // right padding, so the content simply fills the remaining width.
            // Capping the width here as well subtracted the panel a second time,
            // squeezing the content and leaving a dead gap on desktop.
            width: '100%',
            transition: 'all 0.3s ease',
            // Offset the fixed AppBar by its real height — 56px on phones, 64px
            // from `sm` up — so the scroll region isn't ~8px too tall on mobile.
            // `vh` base with a `dvh` override for engines that support it.
            height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
            '@supports (height: 100dvh)': {
              height: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)' },
            },
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
        {showSidePanel && (
          <Paper
            elevation={2}
            sx={{
              // Desktop-only panel; below `md` it's hidden and Level/Pomodoro
              // are surfaced through the bottom sheet instead.
              display: { xs: 'none', md: 'flex' },
              position: 'fixed',
              top: 76,
              right: 12, // Add right margin on desktop
              ...dvhHeight('calc(100dvh - 88px)'), // Account for top/bottom margins
              width: isPanelCollapsed ? '48px' : '300px',
              maxWidth: '324px',
              transition: 'all 0.3s ease',
              flexDirection: 'row',
              borderRadius: '12px',
              zIndex: 1200,
              overflow: 'hidden',
              boxShadow: theme => `0 4px 20px ${theme.palette.mode === 'dark'
                ? 'rgba(0,0,0,0.4)'
                : 'rgba(0,0,0,0.15)'}`,
              background: theme => theme.palette.mode === 'dark'
                ? 'rgba(30,30,30,0.95)'
                : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              transform: isPanelCollapsed ? 'translateX(calc(100% - 48px))' : 'none'
            }}
          >
            <IconButton
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              sx={{
                position: 'absolute',
                left: '-20px',
                top: '50%',
                transform: 'translateY(-50%) translateX(-50%)',
                backgroundColor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                zIndex: 2
              }}
            >
              {isPanelCollapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>

            <Collapse
              in={!isPanelCollapsed}
              orientation="horizontal"
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
            ...dvhMaxHeight('85dvh'),
            pb: 'env(safe-area-inset-bottom)',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('layout.progressTimer')}
          </Typography>
          {levelSystem && <LevelProgress />}
          <PomodoroTimer />
        </Box>
      </Drawer>
    </Box>
  );
};
