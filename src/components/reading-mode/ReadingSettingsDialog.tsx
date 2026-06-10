import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useReadingMode } from '../../context/ReadingModeContext';
import { useI18n } from '../../i18n/I18nContext';

interface ReadingSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ReadingSettingsDialog: React.FC<ReadingSettingsDialogProps> = ({
  open,
  onClose,
}) => {
  const { readingSettings, updateSettings } = useReadingMode();
  const { t } = useI18n();
  const [fontSize, setFontSize] = useState(readingSettings.fontSize);
  const [lineHeight, setLineHeight] = useState(readingSettings.lineHeight);

  useEffect(() => {
    setFontSize(readingSettings.fontSize);
    setLineHeight(readingSettings.lineHeight);
  }, [open, readingSettings.fontSize, readingSettings.lineHeight]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('reading.settings.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Stack>
            <Typography gutterBottom>{t('reading.settings.fontFamily')}</Typography>
            <Select
              value={readingSettings.fontFamily}
              onChange={(event) =>
                void updateSettings({ fontFamily: event.target.value })
              }
            >
              <MenuItem value="Georgia, serif">Georgia</MenuItem>
              <MenuItem value="system-ui, sans-serif">{t('reading.settings.fontSystem')}</MenuItem>
              <MenuItem value="'Times New Roman', serif">Times New Roman</MenuItem>
            </Select>
          </Stack>
          <Stack>
            <Typography gutterBottom>{t('reading.settings.fontSize')}</Typography>
            <Slider
              min={14}
              max={30}
              value={fontSize}
              valueLabelDisplay="auto"
              onChange={(_, value) => setFontSize(value as number)}
              onChangeCommitted={(_, value) =>
                void updateSettings({ fontSize: value as number })
              }
            />
          </Stack>
          <Stack>
            <Typography gutterBottom>{t('reading.settings.lineHeight')}</Typography>
            <Slider
              min={1.3}
              max={2.4}
              step={0.1}
              value={lineHeight}
              valueLabelDisplay="auto"
              onChange={(_, value) => setLineHeight(value as number)}
              onChangeCommitted={(_, value) =>
                void updateSettings({ lineHeight: value as number })
              }
            />
          </Stack>
          <Select
            value={readingSettings.theme}
            onChange={(event) =>
              void updateSettings({
                theme: event.target.value as 'light' | 'dark' | 'sepia',
              })
            }
          >
            <MenuItem value="light">{t('reading.settings.themeLight')}</MenuItem>
            <MenuItem value="dark">{t('reading.settings.themeDark')}</MenuItem>
            <MenuItem value="sepia">{t('reading.settings.themeSepia')}</MenuItem>
          </Select>
          <FormControlLabel
            control={
              <Switch
                checked={readingSettings.enableTTS}
                onChange={(_, checked) =>
                  void updateSettings({ enableTTS: checked })
                }
              />
            }
            label={t('reading.settings.tts')}
          />
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
