import React, { useState, useEffect } from 'react';
import {
  Popover,
  Box,
  Typography,
  CircularProgress,
  Button,
  Fade,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useI18n } from '../../i18n/I18nContext';
import { logger } from '../../services/logging';

interface Props {
  word: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onAddToFlashcards: (word: string, definition: string) => Promise<void>;
}

interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

export const DictionaryLookup: React.FC<Props> = ({
  word,
  anchorEl,
  onClose,
  onAddToFlashcards
}) => {
  const { t } = useI18n();
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDefinition = async () => {
      if (!word) return;
      setIsLoading(true);
      setError(null);

      try {
        logger.info('Fetching word definition', { word });
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Word not found' : 'Failed to fetch definition');
        }
        
        const data = await response.json();
        setDefinition(data[0]);
        
        logger.info('Word definition fetched successfully', {
          word,
          meaningCount: data[0]?.meanings?.length
        });
      } catch (err) {
        const error = err as Error;
        logger.error('Failed to fetch word definition', error, { word });
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (word) fetchDefinition();
  }, [word]);

  const handleAddToFlashcards = async () => {
    if (!definition) return;
    
    try {
      const mainDefinition = definition.meanings[0].definitions[0].definition;
      await onAddToFlashcards(word, mainDefinition);
      logger.info('Word added to flashcards', { word });
      onClose();
    } catch (err) {
      logger.error('Failed to add word to flashcards', err as Error, { word });
    }
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      slotProps={{
        paper: {
          sx: {
            width: 300,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: theme => theme.shadows[10]
          }
        }
      }}
    >
      <Box sx={{ p: 2, maxWidth: 300 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">{word}</Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {definition?.phonetic && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {definition.phonetic}
          </Typography>
        )}
        
        {definition?.meanings.map((meaning, idx) => (
          <Box key={idx} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="primary">
              {meaning.partOfSpeech}
            </Typography>
            {meaning.definitions.slice(0, 2).map((def, i) => (
              <Box key={i} sx={{ mt: 1 }}>
                <Typography variant="body2">
                  {def.definition}
                </Typography>
                {def.example && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    "{def.example}"
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        ))}

        <Button
          startIcon={<AddIcon />}
          variant="contained"
          size="small"
          fullWidth
          onClick={handleAddToFlashcards}
        >
          {t('reading.dictionary.addToFlashcards')}
        </Button>
      </Box>
    </Popover>
  );
};
