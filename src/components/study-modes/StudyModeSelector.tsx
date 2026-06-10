import React, { useMemo } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import {
  School as SchoolIcon,
  CheckBox as CheckBoxIcon,
  TextFields as TextFieldsIcon,
  Compare as CompareIcon,
  Extension as ExtensionIcon
} from '@mui/icons-material';
import type { StudyMode } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface StudyModeSelectorProps {
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
}

const modes: { value: StudyMode; labelKey: string; icon: JSX.Element }[] = [
  { value: 'flashcard', labelKey: 'study.mode.flashcards', icon: <SchoolIcon /> },
  { value: 'multipleChoice', labelKey: 'study.mode.multipleChoice', icon: <CheckBoxIcon /> },
  { value: 'fillInBlanks', labelKey: 'study.mode.fillInBlanks', icon: <TextFieldsIcon /> },
  { value: 'matching', labelKey: 'study.mode.matching', icon: <CompareIcon /> },
  { value: 'fillInPuzzle', labelKey: 'study.mode.crossword', icon: <ExtensionIcon /> }
];

export const StudyModeSelector: React.FC<StudyModeSelectorProps> = ({ mode, onModeChange }) => {
  const { t } = useLanguage();
  const currentIndex = useMemo(() => modes.findIndex(m => m.value === mode), [mode]);
  
  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    onModeChange(modes[newValue].value);
  };

  return (
    <Box sx={{ 
      width: '100%',
      '& .MuiTabs-root': {
        minHeight: { xs: '72px', sm: '64px' }
      },
      '& .MuiTab-root': {
        minHeight: { xs: '72px', sm: '64px' },
        padding: { xs: '12px 8px', sm: '12px 16px' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1, sm: 2 },
        fontSize: { xs: '0.75rem', sm: '0.875rem' },
        '& .MuiSvgIcon-root': {
          fontSize: { xs: '1.5rem', sm: '1.25rem' },
          mb: { xs: 0.5, sm: 0 }
        },
        '&.Mui-selected': {
          backgroundColor: 'action.selected',
          borderRadius: 1
        },
        transition: 'all 0.2s ease-in-out'
      },
      '& .MuiTabs-indicator': {
        height: 3,
        borderRadius: '3px 3px 0 0'
      },
      '& .MuiTabScrollButton-root': {
        '&.Mui-disabled': { opacity: 0.3 },
        width: { xs: 28, sm: 40 }
      }
    }}>
      <Tabs
        value={currentIndex === -1 ? 0 : currentIndex}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label={t('study.mode.aria')}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          pb: { xs: 0.5, sm: 0 }
        }}
      >
        {modes.map((m, index) => (
          <Tab
            key={m.value}
            icon={m.icon}
            label={t(m.labelKey)}
            value={index}
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
                borderRadius: 1
              }
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};
