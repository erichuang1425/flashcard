import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, FormControl, InputLabel, 
  Select, MenuItem, Typography, Paper, Alert,
  Grid, Autocomplete, ToggleButton, ToggleButtonGroup,
  CircularProgress, InputAdornment, Chip
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../context/AuthContext';
import { templates, generateWorksheet } from '../utils/worksheet-templates';
import { addWorksheet, getCategories, getUserFlashcards, getWordsByCategory } from '../services/firestore';
import { VocabularyWord, FlashcardMetadata } from '@/types';
import type { Category, Worksheet, WorksheetQuestion } from '../types';  
import { useI18n } from '../i18n/I18nContext';
import { useFlashcardLibrary } from '../hooks/useFlashcardLibrary';

interface WorksheetData {
  userId: string;
  templateId: string;
  title: string;
  words: string[];
  timeLimit: number;
  difficulty: 'easy' | 'medium' | 'hard';
  categories: string[];
  createdAt: Date;
  questions: WorksheetQuestion[];
  answers: {
    [questionId: string]: {
      correctAnswer: string;
      explanation?: string;
      examples?: string[];
    };
  };
  stats: {
    completed: number;
    total: number;
    lastAttempted?: Date;
    accuracy?: number;
  };
}

export const WorksheetGenerator: React.FC = () => {
  const { user } = useAuth();
  const [templateId, setTemplateId] = useState<string>('comprehensivePractice');
  const [words, setWords] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inputMode, setInputMode] = useState<'database' | 'manual'>('database');
  const [selectedWords, setSelectedWords] = useState<FlashcardMetadata[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const { t } = useI18n();

  const {
    cards,
    loading: metadataLoading,
    error: metadataError,
    searchTerm: librarySearchTerm,
    setSearchTerm: setLibrarySearchTerm,
    filters,
    setFilters
  } = useFlashcardLibrary();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const fetchedCategories = await getCategories();
      const categories = new Set<string>();
      fetchedCategories.forEach(cat => {
        if (cat.name) categories.add(cat.name);
      });
      setAvailableCategories(Array.from(categories));
      setError(null);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Failed to load categories. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    setLibrarySearchTerm(term);
  };

  const handleCategorySelect = async (category: string) => {
    setSelectedCategory(category);
    setFilters(prev => ({
      ...prev,
      categories: category ? [category] : []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to create worksheets');
      return;
    }

    try {
      setError(null);
      setSuccess(false);
      
      let wordList: string[];
      let selectedMetadata: FlashcardMetadata[] | undefined;

      if (inputMode === 'database') {
        if (selectedWords.length === 0) {
          setError('Please select at least one word');
          return;
        }
        wordList = selectedWords.map(w => w.word);
        // Update metadata with userId
        selectedMetadata = selectedWords.map(w => ({
          ...w,
          userId: user.uid
        }));
      } else {
        wordList = words
          .split('\n')
          .map(word => word.trim())
          .filter((word, index, array) => word.length > 0 && array.indexOf(word) === index); 
        
        if (wordList.length === 0) {
          setError('Please enter at least one word');
          return;
        }
      }

      if (!templateId || !templates[templateId]) {
        setError('Please select a valid template');
        return;
      }

      if (timeLimit < 1 || timeLimit > 120) {
        setError('Time limit must be between 1 and 120 minutes');
        return;
      }

      const worksheetData: Omit<Worksheet, 'id'> = {
        userId: user.uid,
        templateId,
        title: `Vocabulary Worksheet - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} (${new Date().toLocaleDateString()})`,
        words: wordList,
        timeLimit,
        difficulty,
        categories: selectedCategories,
        createdAt: new Date(),
        questions: [], 
        answers: {}, 
        stats: {
          completed: 0,
          total: 0,
          accuracy: 0
        }
      };

      const { questions, answers } = await generateWorksheet(
        wordList, 
        templateId, 
        difficulty,
        selectedMetadata // Pass metadata to generator
      );

      if (!questions?.length) {
        throw new Error('Failed to generate worksheet questions');
      }

      worksheetData.questions = questions;
      worksheetData.answers = answers;
      worksheetData.stats.total = questions.length;

      await addWorksheet(worksheetData);
      setSuccess(true);
      setWords('');
      setSelectedWords([]);
    } catch (err) {
      console.error('Worksheet generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create worksheet');
    }
  };

  const wordListTitle = `Vocabulary Worksheet - ${t(`worksheets.difficulty.${difficulty}`)} (${new Date().toLocaleDateString()})`;

  const sortedCards = React.useMemo(() => {
    // Replace current sorting logic with case-insensitive alphabetical sort
    return [...cards].sort((a, b) => 
      a.word.toLowerCase().localeCompare(b.word.toLowerCase())
    );
  }, [cards]);

  const capitalizedCards = React.useMemo(() => {
    return sortedCards.map(card => ({
      ...card,
      word: card.word.charAt(0).toUpperCase() + card.word.slice(1)
    }));
  }, [sortedCards]);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 'lg', mx: 'auto' }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          {t('worksheets.form.title')}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ToggleButtonGroup
              value={inputMode}
              exclusive
              onChange={(_, mode) => mode && setInputMode(mode)}
              fullWidth
              sx={{ 
                display: 'flex',
                '.MuiToggleButton-root': {
                  flex: 1,
                  py: 1.5
                }
              }}
            >
              <ToggleButton value="database">{t('worksheets.form.inputMode.database')}</ToggleButton>
              <ToggleButton value="manual">{t('worksheets.form.inputMode.manual')}</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {inputMode === 'database' && (
            <>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t('worksheets.form.filterCategory')}</InputLabel>
                  <Select
                    value={selectedCategory}
                    label={t('worksheets.form.filterCategory')}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>{t('worksheets.form.allWords')}</em>
                    </MenuItem>
                    {availableCategories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedWords(sortedCards)}
                    disabled={sortedCards.length === 0}
                    startIcon={<SelectAllIcon />}
                  >
                    {t('worksheets.form.selectAll')}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedWords([])}
                    disabled={selectedWords.length === 0}
                    startIcon={<ClearIcon />}
                  >
                    {t('worksheets.form.clearSelection')}
                  </Button>
                </Box>

                <Autocomplete
                  multiple
                  loading={metadataLoading}
                  options={capitalizedCards}
                  value={selectedWords}
                  getOptionLabel={(option) => option.word}
                  onChange={(_, newValue) => setSelectedWords(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      // Destructure the props and separate the key
                      const { key, ...chipProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          {...chipProps}
                          label={option.word}
                          size="small"
                          sx={{ borderRadius: 1 }}
                        />
                      );
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('worksheets.form.selectWords')}
                      placeholder={selectedWords.length === 0 ? t('worksheets.form.searchPlaceholder') : ""}
                      onChange={(e) => handleSearch(e.target.value)}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <SearchIcon color="action" />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {metadataLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            </>
          )}

          {inputMode === 'manual' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label={t('worksheets.form.wordInput')}
                value={words}
                onChange={(e) => setWords(e.target.value)}
                placeholder={t('worksheets.form.manualInputPlaceholder')}
              />
            </Grid>
          )}


          <Grid item xs={12}>
            <FormControl fullWidth>
              <TextField
                label={t('forms.worksheet.titleLabel')}
                value={wordListTitle}
                variant="outlined"
              />
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>{t('worksheets.form.template')}</InputLabel>
              <Select
                value={templateId}
                label={t('worksheets.form.template')}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {Object.entries(templates).map(([id, template]) => (
                  <MenuItem key={id} value={id}>
                    {t(`worksheets.templates.${id}`) || template.title}
                  </MenuItem>  
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="number"
              label={t('worksheets.form.timeLimit')}
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('worksheets.difficulty.difficulty')}</InputLabel>
              <Select
                value={difficulty}
                label={t('worksheets.difficulty.difficulty')}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              >
                <MenuItem value="easy">{t('worksheets.difficulty.easy')}</MenuItem>
                <MenuItem value="medium">{t('worksheets.difficulty.medium')}</MenuItem>
                <MenuItem value="hard">{t('worksheets.difficulty.hard')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
          {success && (
            <Grid item xs={12}>
              <Alert severity="success">{t('common.success')}</Alert>
            </Grid>
          )}

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={!user}
            >
              {t('forms.worksheet.submit')}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
