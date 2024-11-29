import React, { useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Menu,
  MenuItem,
  Slider,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Switch,
  FormControlLabel,
  Collapse,
  Paper,
  Stack,
  Button
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TranslateIcon from '@mui/icons-material/Translate';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import FormatLineSpacingIcon from '@mui/icons-material/FormatLineSpacing';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/Fullscreen';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import useFullscreen from '../../hooks/useFullscreen';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useI18n } from '../../i18n/I18nContext';
import { useReadingMode } from '../../context/ReadingModeContext';
import { logger } from '../../services/logging';
import { useAuth } from '../../context/AuthContext';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { ReadingSettingsDialog } from './ReadingSettingsDialog';
import { useGamification } from '../../context/GamificationContext';

export const ReadingNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, setPreferences } = useUserPreferences();
  const { t } = useI18n();
  const { currentArticle, setCurrentArticle } = useReadingMode();
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fullscreenRef = React.useRef<HTMLElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(fullscreenRef);
  const [textSettingsOpen, setTextSettingsOpen] = useState(false);
  const { showGamePanel, toggleGamePanel } = useGamification();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setSettingsAnchor(null);
  };

  const updateReadingSettings = async (key: string, value: any) => {
    try {
      setPreferences(prev => ({
        ...prev,
        readingSettings: {
          ...prev.readingSettings,
          [key]: value
        }
      }));

      logger.info('Reading settings updated', {
        setting: key,
        value,
        userId: user?.uid
      });
    } catch (err) {
      logger.error('Failed to update reading settings', err as Error, {
        setting: key,
        value,
        userId: user?.uid
      });
    }
  };

  const handleBack = () => {
    if (currentArticle) {
      setCurrentArticle(null);
    } else if (location.pathname === '/reading') {
      navigate('/');
    } else {
      navigate('/reading');
    }
  };

  const handleFontSize = (increment: number) => {
    setPreferences(prev => ({
      ...prev,
      readingSettings: {
        ...prev.readingSettings,
        fontSize: Math.min(Math.max(12, (prev.readingSettings?.fontSize || 16) + increment), 32)
      }
    }));
  };

  const handleLineHeight = (increment: number) => {
    setPreferences(prev => ({
      ...prev,
      readingSettings: {
        ...prev.readingSettings,
        lineHeight: Math.min(Math.max(1, (prev.readingSettings?.lineHeight || 1.6) + increment), 3)
      }
    }));
  };

  const handleFontChange = () => {
    const fonts = ['system-ui', 'Georgia', 'Merriweather', 'Source Serif Pro', 'Crimson Pro', 'Noto Serif', 'IBM Plex Serif'];
    setPreferences(prev => {
      const currentIndex = fonts.indexOf(prev.readingSettings?.fontFamily || 'system-ui');
      const nextIndex = (currentIndex + 1) % fonts.length;
      return {
        ...prev,
        readingSettings: {
          ...prev.readingSettings,
          fontFamily: fonts[nextIndex]
        }
      };
    });
  };

  const handleFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <AppBar 
      position="fixed" 
      color="transparent" 
      elevation={0}
      sx={{
        background: 'transparent',
        top: theme => theme.spacing(8),
        '& .MuiToolbar-root': {
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1200
        },
        width: { 
          xs: '100%',
          md: theme => `calc(100% - ${theme.spacing(8)})`
        },
        transition: 'width 0.3s ease'
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            edge="start" 
            onClick={handleBack}
            sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Box>

        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setMenuOpen(!menuOpen)}
            sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
          >
            <SettingsIcon />
          </IconButton>

          <Collapse in={menuOpen}>
            <Paper 
              sx={{ 
                position: 'absolute',
                top: '100%',
                right: 0,
                mt: 1,
                p: 1,
                minWidth: '48px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                zIndex: 1200
              }}
            >
              <IconButton onClick={() => {
                setTextSettingsOpen(true);
                setMenuOpen(false);
              }}>
                <TextFieldsIcon />
              </IconButton>

              <IconButton onClick={() => {
                updateReadingSettings('focusModeEnabled', !preferences.readingSettings.focusModeEnabled);
                setMenuOpen(false);
              }}>
                <CenterFocusStrongIcon color={preferences.readingSettings.focusModeEnabled ? "secondary" : "inherit"} />
              </IconButton>

              <IconButton onClick={() => {
                handleFullscreen();
                setMenuOpen(false);
              }}>
                {document.fullscreenElement ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>

              <IconButton onClick={() => {
                setDictionaryOpen(true);
                setMenuOpen(false);
              }}>
                <TranslateIcon />
              </IconButton>

              <IconButton onClick={() => {
                toggleGamePanel();
                setMenuOpen(false);
              }}>
                {showGamePanel ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            </Paper>
          </Collapse>
        </Box>

        <ReadingSettingsDialog 
          open={textSettingsOpen}
          onClose={() => setTextSettingsOpen(false)}
        />
      </Toolbar>
    </AppBar>
  );
};