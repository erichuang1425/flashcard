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
import { addWorksheet, getCategories, getUserFlashcards, getVocabularyWords, getWordsByCategory, searchVocabulary } from '../services/firestore';
import { VocabularyWord } from '@/types';
import type { Category, Worksheet, WorksheetQuestion } from '../types';  
import { useLanguage } from '../i18n/LanguageContext';
import { translateOr } from '../i18n/fallback';

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
  const { t, language } = useLanguage();
  const [templateId, setTemplateId] = useState<string>('comprehensivePractice');
  const [words, setWords] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inputMode, setInputMode] = useState<'database' | 'manual'>('database');
  const [vocabularyList, setVocabularyList] = useState<VocabularyWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<VocabularyWord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    loadVocabularyWords();
    loadCategories();
  }, [user]);

  const loadVocabularyWords = async () => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      setIsLoading(true);
      setError(null);
      // Get user's own flashcards and convert them to VocabularyWord type
      const flashcards = await getUserFlashcards(user.uid);
      const vocabularyWords: VocabularyWord[] = flashcards.map(card => ({
        id: card.id,
        word: card.word,
        englishDefinition: card.englishDefinition,
        chineseTranslation: card.chineseTranslation || '',
        partOfSpeech: card.partOfSpeech,
        categories: card.categories
      }));

      if (vocabularyWords.length === 0) {
        setError(t('worksheets.error.noVocabulary'));
        return;
      }
      setVocabularyList(vocabularyWords);
    } catch (err) {
      setError(t('worksheets.error.loadVocabulary'));
      console.error('Error loading vocabulary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const fetchedCategories = await getCategories(user.uid);
      const categories = new Set<string>();
      fetchedCategories.forEach(cat => {
        if (cat.name) categories.add(cat.name);
      });
      setAvailableCategories(Array.from(categories));
      setError(null);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(t('worksheets.error.loadCategories'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    try {
      setIsLoading(true);
      setError(null);
      if (!term) {
        await loadVocabularyWords();
        return;
      }
      const results = await searchVocabulary(term);
      setVocabularyList(results);
      if (results.length === 0) {
        setError(t('worksheets.error.noMatches'));
      }
    } catch (err) {
      setError(t('worksheets.error.search'));
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = async (category: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!user) return;
      setSelectedCategory(category);
      if (category) {
        const categoryWords = await getWordsByCategory(user.uid, category);
        if (categoryWords.length > 0) {
          setVocabularyList(categoryWords);

          setSelectedWords([]);
        } else {
          setError(t('worksheets.error.noCategoryWords'));
          setVocabularyList([]);
          setSelectedWords([]);
        }
      } else {
        await loadVocabularyWords();
        setSelectedWords([]); // Clear selection when removing filter
      }
    } catch (err) {
      setError(t('worksheets.error.loadCategoryWords'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError(t('worksheets.error.signIn'));
      return;
    }

    try {
      setError(null);
      setSuccess(false);
      
      let wordList: string[];
      if (inputMode === 'database') {
        if (selectedWords.length === 0) {
          setError(t('worksheets.error.selectWord'));
          return;
        }
        wordList = selectedWords.map(w => w.word);
      } else {
        wordList = words
          .split('\n')
          .map(word => word.trim())
          .filter((word, index, array) => word.length > 0 && array.indexOf(word) === index); 
        
        if (wordList.length === 0) {
          setError(t('worksheets.error.enterWord'));
          return;
        }
      }

      const worksheetData: Omit<Worksheet, 'id'> = {
        userId: user.uid,
        templateId,
        title: t('worksheets.generator.defaultTitle', {
          difficulty: t(`worksheets.generator.${difficulty}`),
          date: new Date().toLocaleDateString(language === 'zh' ? 'zh-TW' : 'en-US'),
        }),
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
        t
      );
      worksheetData.questions = questions;
      worksheetData.answers = answers;
      worksheetData.stats.total = questions.length;

      await addWorksheet(worksheetData);
      setSuccess(true);
      setWords('');
      setSelectedWords([]);
    } catch (err) {
      console.error('Worksheet generation error:', err);
      setError(t('worksheets.error.create'));
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 'lg', mx: 'auto' }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          {t('worksheets.generator.title')}
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
              <ToggleButton value="database">{t('worksheets.generator.database')}</ToggleButton>
              <ToggleButton value="manual">{t('worksheets.generator.manual')}</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {inputMode === 'database' && (
            <>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t('worksheets.generator.filterCategory')}</InputLabel>
                  <Select
                    value={selectedCategory}
                    label={t('worksheets.generator.filterCategory')}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>{t('worksheets.generator.allWords')}</em>
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
                    onClick={() => setSelectedWords(vocabularyList)}
                    disabled={vocabularyList.length === 0}
                    startIcon={<SelectAllIcon />}
                  >
                    {t('worksheets.generator.selectAll')}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedWords([])}
                    disabled={selectedWords.length === 0}
                    startIcon={<ClearIcon />}
                  >
                    {t('worksheets.generator.clearSelection')}
                  </Button>
                </Box>

                <Autocomplete
                  multiple
                  loading={isLoading}
                  options={vocabularyList}
                  value={selectedWords}
                  getOptionLabel={(option) => `${option.word} - ${option.englishDefinition}`}
                  onChange={(_, newValue) => setSelectedWords(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('worksheets.generator.search')}
                      placeholder={selectedWords.length === 0 ? t('worksheets.generator.searchPlaceholder') : ""}
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
                            {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        label={option.word}
                        size="small"
                        sx={{ borderRadius: 1 }}
                      />
                    ))
                  }
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
                label={t('worksheets.generator.manualLabel')}
                value={words}
                onChange={(e) => setWords(e.target.value)}
                placeholder={t('worksheets.generator.manualPlaceholder')}
              />
            </Grid>
          )}


          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>{t('worksheets.generator.template')}</InputLabel>
              <Select
                value={templateId}
                label={t('worksheets.generator.template')}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {Object.entries(templates).map(([id, template]) => (
                  <MenuItem key={id} value={id}>
                    {translateOr(t, template.titleKey, id)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="number"
              label={t('worksheets.generator.timeLimit')}
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('worksheets.generator.difficulty')}</InputLabel>
              <Select
                value={difficulty}
                label={t('worksheets.generator.difficulty')}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              >
                <MenuItem value="easy">{t('worksheets.generator.easy')}</MenuItem>
                <MenuItem value="medium">{t('worksheets.generator.medium')}</MenuItem>
                <MenuItem value="hard">{t('worksheets.generator.hard')}</MenuItem>
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
              <Alert severity="success">{t('worksheets.generator.created')}</Alert>
            </Grid>
          )}

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={!user}
            >
              {t('worksheets.generator.generate')}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
