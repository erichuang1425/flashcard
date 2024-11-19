import React, { useState, useRef, useEffect } from 'react';
import { 
  Grid, TextField, FormControl, InputLabel, Select,
  MenuItem, SelectChangeEvent, Button, Box, Chip,
  Alert, IconButton, Tooltip, CircularProgress
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useI18n } from '../i18n/I18nContext';
import { translateToTraditionalChinese } from '../services/translationService';
import { TranslationError } from '../types/translationTypes';

interface ManualEntryProps {
  onSubmit: (data: {
    word: string;
    partOfSpeech: string;
    englishDefinition: string;
    chineseTranslation: string;
    categories: string[];
  }) => void;
  availableCategories: string[];
}

export const ImportManualEntry: React.FC<ManualEntryProps> = ({ onSubmit, availableCategories }) => {
  const { t } = useI18n();
  const [manualEntry, setManualEntry] = useState({
    word: '',
    partOfSpeech: '',
    englishDefinition: '',
    chineseTranslation: '',
    categories: [] as string[]
  });
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationSuccess, setTranslationSuccess] = useState(false);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const [translationResult, setTranslationResult] = useState<{
    success: boolean;
    message: string | null;
    status: 'idle' | 'loading' | 'success' | 'error';
  }>({
    success: false,
    message: null,
    status: 'idle'
  });

  useEffect(() => {
    wordInputRef.current?.focus();
  }, []);

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setManualEntry(prev => ({
      ...prev,
      categories: typeof value === 'string' ? value.split(',') : value
    }));
  };

  const handleTextChange = (field: keyof typeof manualEntry) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setManualEntry(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = () => {

    if (!manualEntry.word || !manualEntry.englishDefinition) {
      setTranslationResult({
        success: false,
        message: t('import.errors.missingFields'),
        status: 'error'
      });
      return;
    }

    onSubmit(manualEntry);
    // Reset form after submission
    setManualEntry({
      word: '',
      partOfSpeech: '',
      englishDefinition: '',
      chineseTranslation: '',
      categories: []
    });
 
    setTranslationResult({
      success: false,
      message: null,
      status: 'idle'
    });
  };

  const handleTranslationTest = async () => {
    if (!manualEntry.englishDefinition) {
      setTranslationResult({
        success: false,
        message: t('import.errors.noContent'),
        status: 'error'
      });
      return;
    }
    
    setTranslationResult({ ...translationResult, status: 'loading' });
    setTranslating(true);
    setTranslationError(null);
    setTranslationSuccess(false);

    try {
      const translation = await translateToTraditionalChinese(manualEntry.englishDefinition);
      
      if (!translation || translation.trim() === '') {
        throw new Error('Empty translation result');
      }

      setManualEntry(prev => ({ ...prev, chineseTranslation: translation }));
      setTranslationResult({
        success: true,
        message: t('import.manual.translationSuccess'),
        status: 'success'
      });
      setTranslationSuccess(true);
    } catch (err) {
      console.error('Translation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      setTranslationResult({
        success: false,
        message: t(
          err instanceof TranslationError ? 
            'import.errors.translationFailed' : 
            'import.errors.translationError'
        ) + `: ${errorMessage}`,
        status: 'error'
      });
      setTranslationError(errorMessage);
    } finally {
      setTranslating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <Grid container spacing={3} onKeyDown={handleKeyPress}>
      <Grid item xs={12} md={6}>
        <TextField
          required
          fullWidth
          label={t('import.manual.word')}
          value={manualEntry.word}
          onChange={handleTextChange('word')}
          helperText={
            manualEntry.word.length > 0 && manualEntry.word.length < 2 
              ? t('import.manual.help.wordTooShort')
              : t('import.manual.help.word')
          }
          inputRef={wordInputRef}
          error={manualEntry.word.length > 0 && manualEntry.word.length < 2}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label={t('import.manual.partOfSpeech')}
          value={manualEntry.partOfSpeech}
          onChange={handleTextChange('partOfSpeech')}
          helperText={t('import.manual.help.pos')}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          required
          fullWidth
          multiline
          rows={3}
          label={t('import.manual.englishDefinition')}
          value={manualEntry.englishDefinition}
          onChange={handleTextChange('englishDefinition')}
          helperText={t('import.manual.help.definition')}
          InputProps={{
            endAdornment: (
              <span>
                <Tooltip title={
                  translationResult.status === 'loading' ? 
                    t('import.manual.translating') : 
                    t('import.manual.testTranslation')
                }>
                  <span>
                    <IconButton 
                      onClick={handleTranslationTest}
                      disabled={!manualEntry.englishDefinition || translating}
                      color={translationResult.status === 'success' ? 'success' : 'default'}
                    >
                      {translating ? 
                        <CircularProgress size={24} /> : 
                        <TranslateIcon />
                      }
                    </IconButton>
                  </span>
                </Tooltip>
              </span>
            )
          }}
        />
        {translationResult.status !== 'idle' && (
          <Alert 
            severity={translationResult.status === 'success' ? 'success' : 'error'} 
            sx={{ mt: 1 }}
            onClose={() => setTranslationResult({ ...translationResult, status: 'idle' })}
          >
            {translationResult.message}
          </Alert>
        )}
      </Grid>
      <Grid item xs={12}>
        <TextField
          required
          fullWidth
          multiline
          rows={2}
          label={t('import.manual.chineseTranslation')}
          value={manualEntry.chineseTranslation}
          onChange={handleTextChange('chineseTranslation')}
          helperText={t('import.manual.help.translation')}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>{t('import.manual.categories')}</InputLabel>
          <Select
            multiple
            value={manualEntry.categories}
            onChange={handleCategoryChange}
            label={t('import.manual.categories')}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {availableCategories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!manualEntry.word || !manualEntry.englishDefinition}
            fullWidth
          >
            {t('import.manualEntry.saveEntry')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setManualEntry({
              word: '',
              partOfSpeech: '',
              englishDefinition: '',
              chineseTranslation: '',
              categories: []
            })}
          >
            {t('import.manualEntry.addMore')}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
};