import React, { useMemo } from 'react';
import { Box, Tabs, Tab, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import {
  School as SchoolIcon,
  CheckBox as CheckBoxIcon,
  TextFields as TextFieldsIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import type { StudyMode } from '../../types';
import { useI18n } from '../../i18n/I18nContext';

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
    <FormControl fullWidth>
      <InputLabel>{t('study.modes.title')}</InputLabel>
      <Select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as StudyMode)}
        label={t('study.modes.title')}
      >
        <MenuItem value="flashcard">{t('study.modes.flashcard')}</MenuItem>
        <MenuItem value="multipleChoice">{t('study.modes.multipleChoice')}</MenuItem>
        <MenuItem value="matching">{t('study.modes.matching')}</MenuItem>
        <MenuItem value="fillBlanks">{t('study.modes.fillBlanks')}</MenuItem>
      </Select>
    </FormControl>
  );
};