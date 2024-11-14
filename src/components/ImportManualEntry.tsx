import React, { useState, useRef, useEffect } from 'react';
import { 
  Grid, TextField, FormControl, InputLabel, Select,
  MenuItem, SelectChangeEvent, Button, Box, Chip,
  Alert, IconButton, Tooltip, CircularProgress
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useI18n } from '../i18n/I18nContext';
import { translateToTraditionalChinese } from '../services/translationService';

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

  useEffect(() => {
    // Auto focus word input on mount
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
    onSubmit(manualEntry);
    // Reset form after submission
    setManualEntry({
      word: '',
      partOfSpeech: '',
      englishDefinition: '',
      chineseTranslation: '',
      categories: []
    });
  };

  const handleTranslationTest = async () => {
    if (!manualEntry.englishDefinition) return;
    
    setTranslating(true);
    setTranslationError(null);
    setTranslationSuccess(false);

    try {
      const translation = await translateToTraditionalChinese(manualEntry.englishDefinition);
      setManualEntry(prev => ({ ...prev, chineseTranslation: translation }));
      setTranslationSuccess(true);
    } catch (err) {
      setTranslationError(t('import.errors.translationFailed'));
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
              <Tooltip title={t('import.manual.testTranslation')}>
                <IconButton 
                  onClick={handleTranslationTest}
                  disabled={!manualEntry.englishDefinition || translating}
                >
                  {translating ? <CircularProgress size={24} /> : <TranslateIcon />}
                </IconButton>
              </Tooltip>
            )
          }}
        />
        {translationSuccess && (
          <Alert severity="success" sx={{ mt: 1 }}>
            {t('import.manual.translationSuccess')}
          </Alert>
        )}
        {translationError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {translationError}
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