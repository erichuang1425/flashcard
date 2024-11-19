import React, { useMemo } from 'react';
import { Box, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import {
  School as SchoolIcon,
  CheckBox as CheckBoxIcon,
  TextFields as TextFieldsIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import type { StudyMode } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { Card3D } from '../common/Card3D';
import { GlassPaper } from '../common/StyledComponents';

interface StudyModeSelectorProps {
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  modes?: { value: StudyMode; label: string; icon?: JSX.Element }[];
}

const modes: { value: StudyMode; label: string; icon: JSX.Element }[] = [
  { value: 'flashcard', label: 'Flashcards', icon: <SchoolIcon /> },
  { value: 'multipleChoice', label: 'Multiple Choice', icon: <CheckBoxIcon /> },
  { value: 'fillInBlanks', label: 'Fill Blanks', icon: <TextFieldsIcon /> },
  { value: 'matching', label: 'Matching', icon: <CompareIcon /> }
];

export const StudyModeSelector: React.FC<StudyModeSelectorProps> = ({ 
  mode, 
  onModeChange,
  modes: customModes 
}) => {
  const { t } = useI18n();
  const effectiveModes = customModes || modes;
  const currentIndex = useMemo(() => effectiveModes.findIndex(m => m.value === mode), [mode, effectiveModes]);
  
  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    onModeChange(effectiveModes[newValue].value);
  };

  return (
    <Box sx={{ 
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
      gap: 2
    }}>
      {effectiveModes.map((m) => (
        <GlassPaper
          key={m.value}
          onClick={() => onModeChange(m.value)}
          sx={{
            cursor: 'pointer',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            opacity: mode === m.value ? 1 : 0.7,
            transform: mode === m.value ? 'scale(1.02)' : 'none',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: theme => 
                mode === m.value 
                  ? `linear-gradient(135deg, ${theme.palette.primary.main}20, transparent)`
                  : 'transparent',
              zIndex: -1,
              transition: 'opacity 0.3s ease',
              opacity: 0
            },
            '&:hover': {
              opacity: 1,
              transform: 'scale(1.02)',
              '&::after': {
                opacity: 1
              }
            }
          }}
        >
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            width: '100%'
          }}>
            {m.icon}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1">
                {m.label}
              </Typography>
              {mode === m.value && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    display: 'block',
                    mt: 0.5 
                  }}
                >
                  {t('studyMode.selected')}
                </Typography>
              )}
            </Box>
          </Box>
        </GlassPaper>
      ))}
    </Box>
  );
};