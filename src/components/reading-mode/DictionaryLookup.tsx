import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import {
  addFlashcard,
  getUserFlashcards,
} from '../../services/firestore';
import { useI18n } from '../../i18n/I18nContext';

interface DictionaryLookupProps {
  word: string;
  open: boolean;
  onClose: () => void;
}

interface DictionaryDefinition {
  word: string;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string; example?: string }>;
  }>;
}

export const DictionaryLookup: React.FC<DictionaryLookupProps> = ({
  word,
  open,
  onClose,
}) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [definition, setDefinition] = useState<DictionaryDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState('reading');

  useEffect(() => {
    if (!open || !word) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDefinition(null);

    void fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal }
    )
      .then(async (response) => {
        if (!response.ok) {
          setError(t('reading.dictionary.notFound'));
          return;
        }
        const data = (await response.json()) as DictionaryDefinition[];
        setDefinition(data[0] ?? null);
      })
      .catch((lookupError) => {
        if ((lookupError as Error).name !== 'AbortError') {
          setError(t('reading.dictionary.failed'));
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, t, word]);

  const addToFlashcards = async () => {
    if (!user || !definition) return;
    const cards = await getUserFlashcards(user.uid);
    if (
      cards.some(
        (card) => card.word.toLocaleLowerCase() === word.toLocaleLowerCase()
      )
    ) {
      setError(t('reading.dictionary.duplicate'));
      return;
    }

    const meaning = definition.meanings?.[0];
    const firstDefinition = meaning?.definitions?.[0];
    if (!firstDefinition?.definition) {
      setError(t('reading.dictionary.notFound'));
      return;
    }

    await addFlashcard({
      userId: user.uid,
      word: definition.word || word,
      partOfSpeech: meaning?.partOfSpeech ?? '',
      englishDefinition: firstDefinition.definition,
      chineseTranslation: '',
      difficulty: 0,
      categories: categories
        .split(',')
        .map((category) => category.trim())
        .filter(Boolean),
      created: new Date(),
      nextReview: new Date(),
      mastered: false,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
    });
    onClose();
  };

  const meaning = definition?.meanings?.[0];
  const firstDefinition = meaning?.definitions?.[0];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{word}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {firstDefinition?.definition ? (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="overline">{meaning?.partOfSpeech}</Typography>
            <Typography>{firstDefinition.definition}</Typography>
            {firstDefinition.example ? (
              <Typography color="text.secondary">
                {firstDefinition.example}
              </Typography>
            ) : null}
            <TextField
              label={t('reading.dictionary.categories')}
              value={categories}
              onChange={(event) => setCategories(event.target.value)}
              helperText={t('reading.dictionary.categoriesHint')}
            />
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!firstDefinition?.definition}
          onClick={() => void addToFlashcards()}
        >
          {t('reading.dictionary.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
