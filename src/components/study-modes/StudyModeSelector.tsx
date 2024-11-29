import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { Box, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Typography, Switch, Tooltip, FormControlLabel } from '@mui/material';
import {
  School as SchoolIcon,
  CheckBox as CheckBoxIcon,
  TextFields as TextFieldsIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import { auth } from '../../services/firebase';
import { saveFillInBlanksPreference, getFillInBlanksPreference } from '../../services/firestore';
import type { StudyMode } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { Card3D } from '../common/Card3D';
import { GlassPaper } from '../common/StyledComponents';

interface StudyModeSelectorProps {
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  modes?: { value: StudyMode; label: string; icon?: JSX.Element }[];
  onFillBlanksPreferenceChange?: (useWordAsQuestion: boolean) => void;
  currentFillInBlanksPreference?: boolean;
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
  modes: customModes,
  onFillBlanksPreferenceChange,
  currentFillInBlanksPreference = false 
}) => {
  const { t, language } = useI18n();
  const [useWordAsQuestion, setUseWordAsQuestion] = useState(currentFillInBlanksPreference);

  useEffect(() => {
    const loadPreference = async () => {
      if (auth.currentUser) {
        const pref = await getFillInBlanksPreference(auth.currentUser.uid);
        setUseWordAsQuestion(pref);
      }
    };
    loadPreference();
  }, []);

  const handleToggleChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const newValue = event.target.checked;
    if (auth.currentUser) {
      await saveFillInBlanksPreference(auth.currentUser.uid, newValue);
      setUseWordAsQuestion(newValue);
      onFillBlanksPreferenceChange?.(newValue);
    }
  }, [onFillBlanksPreferenceChange]);

  const effectiveModes = customModes || modes;
  const currentIndex = useMemo(() => effectiveModes.findIndex(m => m.value === mode), [mode, effectiveModes]);
  
  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    onModeChange(effectiveModes[newValue].value);
  };

  const getToggleLabel = (isWordFirst: boolean) => {
    if (language === 'zh-TW') {
      return isWordFirst ? '字→意' : '意→字';
    }
    return isWordFirst ? 'W→C' : 'C→W';
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
            },
            '& .MuiFormControlLabel-root': {
              ml: 'auto',
              mr: 0,
              '& .MuiSwitch-root': {
                ml: { xs: 1, sm: 2 },
                transform: { xs: 'scale(0.8)', sm: 'none' }
              },
              '& .MuiTypography-root': {
                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                whiteSpace: 'nowrap'
              }
            }
          }}
        >
          <Box sx={{ 
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            width: '100%',
            position: 'relative'
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
                    mt: 0.5 ,
                    fontSize: '1.5vh',
                  }}
                >
                  {t('studyMode.selected')}
                </Typography>
              )}
            </Box>
            {m.value === 'fillInBlanks' && (
              <>
                <Box sx={{ 
                  display: { xs: 'block', sm: 'none' },
                  ml: 'auto'
                }}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={useWordAsQuestion}
                        onChange={handleToggleChange}
                        onClick={e => e.stopPropagation()}
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                        {getToggleLabel(useWordAsQuestion)}
                      </Typography>
                    }
                    sx={{ 
                      flexDirection: 'row-reverse',
                      mr: 0
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                </Box>

                <Box sx={{ 
                  display: { xs: 'none', sm: 'flex' },
                  flexDirection: 'column',
                  alignItems: 'center',
                  ml: 'auto',
                  gap: 0.5
                }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                      mb: 0.5
                    }}
                  >
                    {getToggleLabel(useWordAsQuestion)}
                  </Typography>
                  <Switch
                    size="small"
                    checked={useWordAsQuestion}
                    onChange={handleToggleChange}
                    onClick={e => e.stopPropagation()}
                    sx={{
                      p: 0.25,
                      width: 32,
                      height: 16,
                      '& .MuiSwitch-switchBase': {
                        p: 0,
                        margin: 0.25,
                        '&.Mui-checked': {
                          transform: 'translateX(16px)',
                          color: 'primary.main'
                        }
                      },
                      '& .MuiSwitch-thumb': {
                        width: 12,
                        height: 12
                      },
                      '& .MuiSwitch-track': {
                        borderRadius: 8
                      }
                    }}
                  />
                </Box>
              </>
            )}
          </Box>
        </GlassPaper>
      ))}
    </Box>
  );
};