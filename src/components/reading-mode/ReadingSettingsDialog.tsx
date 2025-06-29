import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Slider,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  Box
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useI18n } from '../../i18n/I18nContext';

interface ReadingSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ReadingSettingsDialog: React.FC<ReadingSettingsDialogProps> = ({ open, onClose }) => {
  const { preferences, setPreferences } = useUserPreferences();
  const { t } = useI18n();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const updateSettings = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      readingSettings: {
        ...prev.readingSettings,
        [key]: value
      }
    }));
  };

  return (
    <Dialog 
      fullScreen={isMobile}
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: { 
          width: isMobile ? '100%' : 400,
          height: isMobile ? '100%' : 'auto' 
        }
      }}
    >
      <DialogTitle>
        {t('reading.settings.title')}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Simplified font selector for mobile */}
          {isMobile ? (
            <Select
              value={preferences.readingSettings.fontFamily}
              onChange={(e) => updateSettings('fontFamily', e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
            >
              <MenuItem value="system-ui">{t('reading.settings.fonts.system')}</MenuItem>
              <MenuItem value="Georgia">{t('reading.settings.fonts.georgia')}</MenuItem>
              <MenuItem value="Merriweather">{t('reading.settings.fonts.merriweather')}</MenuItem>
              <MenuItem value="Source Serif Pro">{t('reading.settings.fonts.sourceSerif')}</MenuItem>
              <MenuItem value="Crimson Pro">{t('reading.settings.fonts.crimson')}</MenuItem>
              <MenuItem value="Noto Serif">{t('reading.settings.fonts.notoSerif')}</MenuItem>
              <MenuItem value="IBM Plex Serif">{t('reading.settings.fonts.ibmPlex')}</MenuItem>
            </Select>
          ) : (
            <Box>
              {/* Desktop font settings */}
              <Typography gutterBottom>{t('reading.settings.fontFamily')}</Typography>
              <Select
                value={preferences.readingSettings.fontFamily}
                onChange={(e) => updateSettings('fontFamily', e.target.value)}
                fullWidth
              >
                <MenuItem value="system-ui">{t('reading.settings.fonts.system')}</MenuItem>
                <MenuItem value="Georgia">{t('reading.settings.fonts.georgia')}</MenuItem>
                <MenuItem value="Merriweather">{t('reading.settings.fonts.merriweather')}</MenuItem>
                <MenuItem value="Source Serif Pro">{t('reading.settings.fonts.sourceSerif')}</MenuItem>
                <MenuItem value="Crimson Pro">{t('reading.settings.fonts.crimson')}</MenuItem>
                <MenuItem value="Noto Serif">{t('reading.settings.fonts.notoSerif')}</MenuItem>
                <MenuItem value="IBM Plex Serif">{t('reading.settings.fonts.ibmPlex')}</MenuItem>
              </Select>
            </Box>
          )}

          <Typography gutterBottom>{t('reading.settings.fontSize')}</Typography>
          <Slider
            value={preferences.readingSettings.fontSize}
            onChange={(_, value) => updateSettings('fontSize', value)}
            min={12}
            max={32}
            marks
            valueLabelDisplay="auto"
          />

          <Typography gutterBottom sx={{ mt: 3 }}>{t('reading.settings.lineHeight')}</Typography>
          <Slider
            value={preferences.readingSettings.lineHeight}
            onChange={(_, value) => updateSettings('lineHeight', value)}
            min={1}
            max={3}
            step={0.1}
            marks
            valueLabelDisplay="auto"
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};