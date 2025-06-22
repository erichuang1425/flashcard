import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  CircularProgress,
  Button,
  Fade,
  IconButton,
  Tooltip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  TextField,
  Chip,
  Checkbox,
  ListItemText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useI18n } from '../../i18n/I18nContext';
import { logger } from '../../services/logging';
import { getUserFlashcards, addFlashcard, addCategory, getFlashcardMetadata } from '../../services/firestore';
import { useAuth } from '../../context/AuthContext';
import  { Flashcard, FlashcardCounter }  from '../../types/index';
import { MobileDictionaryLookup } from './MobileDictionaryLookup';

interface Props {
  word: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onAddToFlashcards: (word: string, definition: string) => Promise<void>;
  translation?: string;
  onTranslate: (text: string) => Promise<void>;
  metadata: FlashcardCounter | null;
  categories: Record<string, number>;
  onCategoryUpdate: (newCategory: string) => void;
}

interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const DictionaryLookup: React.FC<Props> = ({
  word,
  anchorEl,
  onClose,
  onAddToFlashcards,
  translation,
  onTranslate,
  metadata,
  categories,
  onCategoryUpdate
}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const { user } = useAuth();
  const { t } = useI18n();

  const [searchWord, setSearchWord] = useState(word);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [definition, setDefinition] = useState<WordDefinition | null>(null);

  useEffect(() => {
    if (word) {
      handleLookup(word);
    }
  }, [word]);

  const handleLookup = async (text: string) => {
    logger.info('Dictionary lookup initiated', { word: text });
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${text}`);
      if (!response.ok) throw new Error('Word not found');
      const data = await response.json();
      setDefinition(data[0]);
      onTranslate(text);
      logger.info('Dictionary lookup successful', { word: text });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to lookup word';
      logger.error('Dictionary lookup failed', err as Error, { word: text });
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDuplicate = async (word: string): Promise<boolean> => {
    if (!user || !metadata) return false;
    try {
      const normalizedWord = word.toLowerCase().trim();
      const isDuplicate = metadata.items.some(item => 
        item.word.toLowerCase().trim() === normalizedWord
      );
      
      if (isDuplicate) {
        logger.info('Duplicate word detected', { word: normalizedWord });
      }
      return isDuplicate;
    } catch (err) {
      logger.error('Failed to check duplicates', err as Error, { word });
      return false;
    }
  };

  const handleAddToFlashcards = async () => {
    if (!definition || !user) {
      logger.warn('Cannot add flashcard - missing definition or user');
      return;
    }
    
    try {
      logger.info('Adding word to flashcards', { 
        word: definition.word,
        categories: selectedCategories
      });

      const isDuplicate = await checkDuplicate(definition.word);
      if (isDuplicate) {
        logger.warn('Duplicate word detected during add', { word: definition.word });
        setError('This word already exists in your flashcards');
        return;
      }

      const mainDefinition = definition.meanings[0];
      if (!mainDefinition || !mainDefinition.definitions[0]) {
        logger.error('Invalid definition format', new Error('Invalid definition format'), { word: definition.word });
        setError('Invalid definition format');
        return;
      }

      const categoriesRecord = selectedCategories.reduce((acc, cat) => {
        acc[cat] = categories[cat];
        return acc;
      }, {} as Record<string, number>);

      const categoriesMap = selectedCategories.reduce<Record<string, number>>((acc, cat) => {
        if (categories[cat] !== undefined) {
          acc[cat] = categories[cat];
        }
        return acc;
      }, {});

      await addFlashcard({
        userId: user.uid,
        word: definition.word.trim(),
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

      logger.info('Successfully added flashcard', { 
        word: definition.word,
        categories: categoriesRecord
      });
      onClose();
    } catch (err) {
      logger.error('Failed to add flashcard', err as Error, {
        word: definition.word,
        categories: selectedCategories
      });
      setError('Failed to add flashcard');
    }
  };

  const handleCategoryChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    const newCategories = typeof value === 'string' ? [] : value as string[];
    logger.info('Categories selection changed', {
      added: newCategories.filter(cat => !selectedCategories.includes(cat)),
      removed: selectedCategories.filter(cat => !newCategories.includes(cat)),
      total: newCategories.length,
      categories
    });
    setSelectedCategories(newCategories);
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const trimmedCategory = newCategory.trim();
      
      if (Object.keys(categories).includes(trimmedCategory)) {
        logger.warn('Attempted to add duplicate category', { 
          category: trimmedCategory,
          existingCategories: categories 
        });
        return;
      }

      onCategoryUpdate(trimmedCategory);
      setSelectedCategories([...selectedCategories, trimmedCategory]);
      setNewCategory('');
    }
  };

  const getCategoryValues = (): string[] => {
    if (!categories) return [];
    return Object.keys(categories);
  };

  if (isMobileDevice()) {
    return (
      <MobileDictionaryLookup
        word={word}
        open={Boolean(anchorEl)}
        onClose={onClose}
        onAddToFlashcards={onAddToFlashcards}
        translation={translation}
        onTranslate={onTranslate}
        onLookup={async () => {}}
        definition={null}
        isLoading={false}
        error={null}
        metadata={metadata}
        categories={categories}
        onCategoryUpdate={onCategoryUpdate}
      />
    );
  }

  return (
    <Dialog 
      open={Boolean(anchorEl)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh'
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ width: '100%' }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 3,
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <Typography variant="h6" sx={{ 
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              fontWeight: 500 
            }}>
              Dictionary
            </Typography>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ m: 3 }}>
            <TextField
              fullWidth
              size="small"
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              placeholder="Search word"
              onKeyPress={(e) => e.key === 'Enter' && handleLookup(searchWord)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Box>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {error && (
            <Typography color="error" variant="body2" sx={{ m: 2 }}>
              {error}
            </Typography>
          )}

          {definition && (
            <Box sx={{ px: 3, pb: 3 }}>
              {translation && (
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                }}>
                  <Typography 
                    variant="subtitle2" 
                    color="primary" 
                    sx={{ mb: 1, fontWeight: 500 }}
                  >
                    中文翻譯
                  </Typography>
                  <Typography variant="body2">{translation}</Typography>
                </Box>
              )}

              {definition.meanings?.map((meaning, idx) => (
                <Box key={idx} sx={{ 
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.default'
                }}>
                  <Typography 
                    variant="subtitle2" 
                    color="primary"
                    sx={{ mb: 1.5, fontWeight: 500 }}
                  >
                    {meaning.partOfSpeech}
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    {meaning.definitions.slice(0, 2).map((def, i) => (
                      <Box key={i} sx={{ mb: 3 }}>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {def.definition}
                        </Typography>
                        {def.example && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontStyle: 'italic',
                              pl: 2,
                              py: 1,
                              borderLeft: 2,
                              borderColor: 'primary.main',
                              bgcolor: 'action.hover',
                              borderRadius: '0 8px 8px 0'
                            }}
                          >
                            Example: {def.example}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}

              <Box sx={{ 
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.default'
              }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Categories</InputLabel>
                  <Select
                    multiple
                    value={selectedCategories}
                    onChange={handleCategoryChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small"
                            onDelete={() => {
                              setSelectedCategories(prev => 
                                prev.filter(cat => cat !== value)
                              );
                            }}
                          />
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
                      <MenuItem 
                        key={category} 
                        value={category}
                        sx={{ display: 'flex', gap: 1 }}
                      >
                        <Checkbox checked={selectedCategories.includes(category)} />
                        <Typography>{category}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ 
                  display: 'flex', 
                  gap: 1,
                  my: 3
                }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category"
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleAddCategory}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddToFlashcards}
          disabled={!definition}
        >
          Add to Flashcards
        </Button>
      </DialogActions>
    </Dialog>
  );
};
