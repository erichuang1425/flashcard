import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { addFlashcard, getFlashcardMetadata } from '../../services/firestore';
import { logger } from '../../services/logging';
import { SelectChangeEvent } from '@mui/material/Select';
import { FlashcardCounter } from '../../types';

interface Props {
  word: string;
  open: boolean;
  onClose: () => void;
  onAddToFlashcards: (word: string, definition: string) => Promise<void>;
  onLookup: (word: string) => void;
  definition: any;
  isLoading: boolean;
  error: string | null;
  translation?: string;
  onTranslate: (text: string) => Promise<void>;
  metadata: FlashcardCounter | null;
  categories: Record<string, number>;
  onCategoryUpdate: (newCategory: string) => void;
}

export const MobileDictionaryLookup: React.FC<Props> = ({
  word,
  open,
  onClose,
  onAddToFlashcards,
  onLookup,
  definition,
  isLoading,
  error,
  translation,
  onTranslate,
  metadata,
  categories,
  onCategoryUpdate
}) => {
  const { t } = useI18n();
  const [searchWord, setSearchWord] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const { user } = useAuth();
  const [addError, setAddError] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchWord.trim()) {
      onLookup(searchWord.trim());
    }
  };

  useEffect(() => {
    if (word) {
      onTranslate(word);
    }
  }, [word, onTranslate]);

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedCategories(typeof value === 'string' ? value.split(',') : value);
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !Object.keys(categories).includes(newCategory.trim())) {
      onCategoryUpdate(newCategory.trim());
      setSelectedCategories([...selectedCategories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const checkDuplicate = async (word: string): Promise<boolean> => {
    if (!user || !metadata) return false;
    try {
      const normalizedWord = word.toLowerCase().trim();
      return metadata.items.some(item => 
        item.word.toLowerCase().trim() === normalizedWord
      );
    } catch (err) {
      logger.error('Failed to check duplicates:', err as Error);
      return false;
    }
  };

  const handleAddToFlashcards = async () => {
    if (!definition || !user) return;
    
    try {
      setAddError(null);
      
      const isDuplicate = await checkDuplicate(word);
      if (isDuplicate) {
        setAddError('This word already exists in your flashcards');
        return;
      }

      const mainDefinition = definition.meanings[0];
      if (!mainDefinition || !mainDefinition.definitions[0]) {
        setAddError('Invalid definition format');
        return;
      }

      const categoriesMap = selectedCategories.reduce<Record<string, number>>((acc, cat) => {
        if (categories[cat] !== undefined) {
          acc[cat] = categories[cat];
        }
        return acc;
      }, {});

      await addFlashcard({
        userId: user.uid,
        word: word.trim(),
        partOfSpeech: mainDefinition.partOfSpeech || '',
        englishDefinition: mainDefinition.definitions[0].definition.trim(),
        chineseTranslation: translation?.trim() || '',
        exampleSentence: mainDefinition.definitions[0].example?.trim(),
        categories: categoriesMap,
        difficulty: 0,
        created: new Date(),
        lastReviewed: undefined,
        nextReview: new Date(),
        state: "NEW",
        interval: 0,
        easeFactor: 2.5,
        reviews: 0,
        successRate: 0,
        totalCorrect: 0,
        mature: false,
        position: 0
      });

      onClose();
    } catch (err) {
      setAddError('Failed to add flashcard');
      logger.error('Failed to add word to flashcards', err as Error);
    }
  };

  const getCategoryValues = (): string[] => {
    if (!categories) return [];
    return Object.keys(categories);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '80vh',
          pb: 'env(safe-area-inset-bottom)'
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Dictionary</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <form onSubmit={handleSearch}>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              fullWidth
              value={word || searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              placeholder="Enter word to look up"
              size="small"
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={isLoading}
            >
              Look up
            </Button>
          </Box>
        </form>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {definition && (
          <Box sx={{ mt: 2 }}>
            {translation && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary">
                  中文翻譯
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {translation}
                </Typography>
                <Divider sx={{ my: 2 }} />
              </Box>
            )}

            {definition.meanings?.map((meaning: any, idx: number) => (
              <Box key={idx} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary">
                  {meaning.partOfSpeech}
                </Typography>
                {meaning.definitions.slice(0, 2).map((def: any, i: number) => (
                  <Box key={i} sx={{ mt: 1 }}>
                    <Typography variant="body2">{def.definition}</Typography>
                    {def.example && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ 
                          mt: 0.5, 
                          fontStyle: 'italic',
                          '&::before': { content: '"Example: "' }
                        }}
                      >
                        {def.example}
                      </Typography>
                    )}
                  </Box>
                ))}
                <Divider sx={{ my: 2 }} />
              </Box>
            ))}

            <FormControl fullWidth sx={{ mt: 2, mb: 1 }}>
              <InputLabel>Categories</InputLabel>
              <Select
                multiple
                value={selectedCategories}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCategories(typeof value === 'string' ? value.split(',') : value);
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 224,
                    },
                  },
                  keepMounted: true,
                }}
              >
                {getCategoryValues().map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Add new category"
              />
              <Button
                size="small"
                variant="outlined"
                onClick={handleAddCategory}
                disabled={!newCategory.trim()}
              >
                Add
              </Button>
            </Box>

            {addError && (
              <Typography 
                color="error" 
                sx={{ mb: 2 }}
                variant="body2"
              >
                {addError}
              </Typography>
            )}

            <Button
              startIcon={<AddIcon />}
              variant="contained"
              fullWidth
              onClick={handleAddToFlashcards}
              sx={{ mt: 2 }}
            >
              {t('reading.dictionary.addToFlashcards')}
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};