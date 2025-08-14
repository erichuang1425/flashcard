import React, { useState, useRef, useEffect } from 'react';
import { 
  Grid, TextField, FormControl, InputLabel, Select,
  MenuItem, SelectChangeEvent, Button, Box, Chip,
  Alert, IconButton, Tooltip, CircularProgress, FormControlLabel, Switch
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import SearchIcon from '@mui/icons-material/Search';
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
    exampleSentence: string; // Add example sentence field
  }) => void;
  availableCategories: string[];
  existingWords?: string[]; // Add this prop
}

interface TranslationResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  quotaFinished?: boolean;
  responseStatus: number;
  responseDetails?: string;
}

export const ImportManualEntry: React.FC<ManualEntryProps> = ({ onSubmit, availableCategories, existingWords = [] }) => {
  const { t } = useI18n();
  const [manualEntry, setManualEntry] = useState({
    word: '',
    partOfSpeech: '',
    englishDefinition: '',
    chineseTranslation: '',
    categories: [] as string[],
    exampleSentence: ''  // Add example sentence field
  });
  const [translating, setTranslating] = useState(false);
  
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationSuccess, setTranslationSuccess] = useState(false);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const partOfSpeechInputRef = useRef<HTMLInputElement>(null);
  const englishDefInputRef = useRef<HTMLInputElement>(null);
  const chineseTransInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const exampleSentenceInputRef = useRef<HTMLInputElement>(null);
  const [defaultCategories, setDefaultCategories] = useState<string[]>([]);
  const [useDefaultCategories, setUseDefaultCategories] = useState(false);
  const [translationResult, setTranslationResult] = useState<{
    success: boolean;
    message: string | null;
    status: 'idle' | 'loading' | 'success' | 'error';
  }>({
    success: false,
    message: null,
    status: 'idle'
  });

  const [definitionLookup, setDefinitionLookup] = useState({
    loading: false,
    error: null as string | null,
    success: false
  });

  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  useEffect(() => {
    wordInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (useDefaultCategories) {
      setManualEntry(prev => ({
        ...prev,
        categories: defaultCategories
      }));
    }
  }, [defaultCategories, useDefaultCategories]);

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
    if (field === 'word') {
      setDuplicateError(null);
    }
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

    // Check for duplicates (case-insensitive)
    const normalizedWord = manualEntry.word.toLowerCase().trim();
    if (existingWords.some(w => w.toLowerCase().trim() === normalizedWord)) {
      setDuplicateError(t('import.manual.help.wordDuplicate', { values: {values: manualEntry.word }}));
      return;
    }

    onSubmit(manualEntry);
    // Reset form after submission
    setManualEntry({
      word: '',
      partOfSpeech: '',
      englishDefinition: '',
      chineseTranslation: '',
      categories: useDefaultCategories ? defaultCategories : [],
      exampleSentence: ''  // Add example sentence field
    });
 
    setTranslationResult({
      success: false,
      message: null,
      status: 'idle'
    });
    setDuplicateError(null);
  };

  const handleTranslationTest = async () => {
    if (!manualEntry.word || !manualEntry.englishDefinition) {
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
      const data = `${manualEntry.word}: ${manualEntry.englishDefinition}`;
      const translationResp = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(data)}&langpair=en|zh-TW`
      );

      if (!translationResp.ok) {
        throw new Error('Translation failed');
      }

      const translationData = await translationResp.json() as TranslationResponse;

      if (translationData.responseStatus !== 200) {
        throw new Error(translationData.responseDetails || 'Translation failed');
      }

      setManualEntry(prev => ({ 
        ...prev, 
        chineseTranslation: translationData.responseData.translatedText 
      }));
      
      setTranslationResult({
        success: true,
        message: t('import.manual.translationSuccess'),
        status: 'success'
      });
      
    } catch (err) {
      console.error('Translation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      setTranslationResult({
        success: false,
        message: t('import.errors.translationError', { values: {values: errorMessage }}),
        status: 'error'
      });
      setTranslationError(errorMessage);
    } finally {
      setTranslating(false);
    }
  };

  const handleDefinitionLookup = async () => {
    if (!manualEntry.word) {
      setDefinitionLookup({
        loading: false,
        error: t('import.errors.noContent'),
        success: false
      });
      return;
    }

    setDefinitionLookup({ loading: true, error: null, success: false });

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${manualEntry.word}`);
        
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Word not found' : 'Failed to fetch definition');
      }
      
      const data = await response.json();
      const definition = data[0];
      
      if (!definition || !definition.meanings?.[0]?.definitions?.[0]) {
        throw new Error('No definition found');
      }

      const firstDef = definition.meanings[0];
      const firstDefData = firstDef.definitions[0];
      
      setManualEntry(prev => ({
        ...prev,
        partOfSpeech: firstDef.partOfSpeech || prev.partOfSpeech,
        englishDefinition: firstDefData.definition,
        exampleSentence: firstDefData.example || '' // Add example sentence if available
      }));
      
      setDefinitionLookup({ loading: false, error: null, success: true });
    } catch (err) {
      setDefinitionLookup({
        loading: false,
        error: err instanceof Error ? err.message : 'Definition lookup failed',
        success: false
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      switch (currentField) {
        case 'word':
          partOfSpeechInputRef.current?.focus();
          break;
        case 'partOfSpeech':
          englishDefInputRef.current?.focus();
          break;
        case 'englishDefinition':
          chineseTransInputRef.current?.focus();
          break;
        case 'chineseTranslation':
          exampleSentenceInputRef.current?.focus();
          break;
        case 'exampleSentence':
          categoryInputRef.current?.focus();
          break;
        case 'categories':
          handleSubmit();
          wordInputRef.current?.focus();
          break;
      }
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={useDefaultCategories}
                onChange={(e) => setUseDefaultCategories(e.target.checked)}
              />
            }
            label={t('import.manual.useDefaultCategories')}
          />
          {useDefaultCategories && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setDefaultCategories(manualEntry.categories)}
            >
              {t('import.manual.setAsDefault')}
            </Button>
          )}
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
      <TextField
  required
  fullWidth
  label={t('import.manual.word')}
  value={manualEntry.word}
  onChange={handleTextChange('word')}
  error={manualEntry.word.length > 0 && (
    manualEntry.word.length < 2 || 
    existingWords.includes(manualEntry.word.toLowerCase().trim())
  )}
  helperText={
    manualEntry.word.length > 0 && manualEntry.word.length < 2 
      ? t('import.manual.help.wordTooShort')
      : existingWords.includes(manualEntry.word.toLowerCase().trim())
      ? t('import.manual.help.wordDuplicate')
      : t('import.manual.help.word')
  }
  inputRef={wordInputRef}
  onKeyDown={(e) => handleKeyPress(e, 'word')}
          InputProps={{
            endAdornment: (
              <Tooltip title={t('import.manual.lookupDefinition')}>
                <span>
                  <IconButton
                    onClick={handleDefinitionLookup}
                    disabled={!manualEntry.word || definitionLookup.loading}
                    color={definitionLookup.success ? 'success' : 'default'}
                  >
                    {definitionLookup.loading ? 
                      <CircularProgress size={24} /> : 
                      <SearchIcon />
                    }
                  </IconButton>
                </span>
              </Tooltip>
            )
          }}
        />
        {definitionLookup.error && (
          <Alert 
            severity="error" 
            sx={{ mt: 1 }}
            onClose={() => setDefinitionLookup(prev => ({ ...prev, error: null }))}
          >
            {definitionLookup.error}
          </Alert>
        )}
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
          inputRef={englishDefInputRef}
          onKeyDown={(e) => handleKeyPress(e, 'englishDefinition')}
          InputProps={{
            endAdornment: (
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
          inputRef={chineseTransInputRef}
          onKeyDown={(e) => handleKeyPress(e, 'chineseTranslation')}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={2}
          label={t('flashcards.fields.exampleSentence')}
          value={manualEntry.exampleSentence}
          onChange={handleTextChange('exampleSentence')}
          helperText={t('import.manual.help.example')}
          inputRef={exampleSentenceInputRef}
          onKeyDown={(e) => handleKeyPress(e, 'exampleSentence')}
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
            inputRef={categoryInputRef}
            onKeyDown={(e) => handleKeyPress(e, 'categories')}
          >
            {availableCategories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      {duplicateError && (
        <Grid item xs={12}>
          <Alert severity="error" onClose={() => setDuplicateError(null)}>
            {duplicateError}
          </Alert>
        </Grid>
      )}
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
              categories: [],
              exampleSentence: ''  // Add example sentence field
            })}
          >
            {t('import.manualEntry.addMore')}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
};