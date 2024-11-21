import React, { useState } from 'react';
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
  FormControlLabel
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useI18n } from '../../i18n/I18nContext';
import { useReadingMode } from '../../context/ReadingModeContext';
import { logger } from '../../services/logging';
import { useAuth } from '../../context/AuthContext';

export const ReadingNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, setPreferences } = useUserPreferences();
  const { t } = useI18n();
  const { currentArticle, setCurrentArticle } = useReadingMode();
  const { user } = useAuth();
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);

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
    } else {
      navigate('/reading');
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

        <IconButton 
          onClick={handleSettingsClick}
          sx={{ 
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'background.paper',
            }
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Toolbar>

      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 320, maxHeight: '80vh' }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('reading.settings.fontSize')}
          </Typography>
          <Slider
            value={preferences.readingSettings.fontSize}
            onChange={(_, value) => updateReadingSettings('fontSize', value)}
            min={12}
            max={32}
            marks
            valueLabelDisplay="auto"
          />

          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('reading.settings.fontFamily')}</InputLabel>
              <Select
                value={preferences.readingSettings.fontFamily}
                onChange={(e) => updateReadingSettings('fontFamily', e.target.value)}
                label={t('reading.settings.fontFamily')}
              >
                <MenuItem value="system-ui">{t('reading.settings.fonts.system')}</MenuItem>
                <MenuItem value="Georgia">{t('reading.settings.fonts.georgia')}</MenuItem>
                <MenuItem value="Merriweather">{t('reading.settings.fonts.merriweather')}</MenuItem>
                <MenuItem value="'Source Serif Pro'">{t('reading.settings.fonts.sourceSerif')}</MenuItem>
                <MenuItem value="'Crimson Pro'">{t('reading.settings.fonts.crimson')}</MenuItem>
                <MenuItem value="'Noto Serif'">{t('reading.settings.fonts.notoSerif')}</MenuItem>
                <MenuItem value="'IBM Plex Serif'">{t('reading.settings.fonts.ibmPlex')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('reading.settings.lineHeight')}
            </Typography>
            <Slider
              value={preferences.readingSettings.lineHeight}
              onChange={(_, value) => updateReadingSettings('lineHeight', value)}
              min={1}
              max={3}
              step={0.1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.readingSettings.focusModeEnabled}
                onChange={(e) => updateReadingSettings('focusModeEnabled', e.target.checked)}
              />
            }
            label={t('reading.settings.focusMode')}
          />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.readingSettings.enableTTS}
                onChange={(e) => updateReadingSettings('enableTTS', e.target.checked)}
              />
            }
            label={t('reading.settings.enableTTS')}
          />
        </Box>
      </Menu>
    </AppBar>
  );
};