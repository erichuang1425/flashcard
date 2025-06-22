import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Box, Typography, TextField, 
  FormControlLabel, Switch, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, IconButton,
  Alert, CircularProgress, Pagination,
  DialogContentText,
  InputAdornment
} from '@mui/material';
import { FlashcardGrid } from '../components/library/FlashcardGrid';
import { useFlashcardLibrary } from '../hooks/useFlashcardLibrary';
import { useI18n } from '../i18n/I18nContext';
import { FlashcardMetadata } from '../types';
import FlashCard from '../components/FlashCard';
import type { Flashcard } from '../types';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../hooks/useSnackbar';
import CloseIcon from '@mui/icons-material/Close';
import { getFlashcard, updateFlashcard } from '../services/firestore';
import SearchIcon from '@mui/icons-material/Search';
import { FlashcardOverlay } from '../components/library/FlashcardOverlay';

export const FlashcardLibrary: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const showSnackbar = useSnackbar();
  const confirm = useConfirm();
  
  const [viewCard, setViewCard] = useState<FlashcardMetadata | null>(null);
  const [editCard, setEditCard] = useState<FlashcardMetadata | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(new Set<string>());
  const [fullCard, setFullCard] = useState<Flashcard | null>(null);
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Flashcard>>({});
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [fullEditCard, setFullEditCard] = useState<Flashcard | null>(null);
  const [sourceElement, setSourceElement] = useState<HTMLElement | null>(null);

  const {
    cards,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    refresh,
    deleteCard,
    page,
    setPage,
    totalPages
  } = useFlashcardLibrary();

  useEffect(() => {
    if (error) {
      showSnackbar(error, 'error');
    }
  }, [error, showSnackbar]);

  const handleDelete = useCallback(async (card: FlashcardMetadata) => {
    if (!user || deleteInProgress.has(card.id)) return;

    try {
      const confirmed = await confirm({
        title: t('flashcards.delete.confirmTitle'),
        message: t('flashcards.delete.confirmMessage', { values: { word: card.word } }),
        confirmText: t('common.delete'),
        confirmColor: 'error'
      });

      if (confirmed) {
        setDeleteInProgress(prev => new Set([...prev, card.id]));
        await deleteCard(card.id);
        showSnackbar(t('flashcards.delete.success'), 'success');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar(t('flashcards.delete.error'), 'error');
    } finally {
      setDeleteInProgress(prev => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
    }
  }, [user, confirm, t, deleteCard, showSnackbar]);

  const handleViewCard = useCallback(async (card: FlashcardMetadata) => {
    if (!user) return;
    
    const cardElement = document.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement | null;
    setSourceElement(cardElement);
    
    setViewCard(card);
    setIsLoadingCard(true);
    setCardError(null);
    
    try {
      const fullCardData = await getFlashcard(user.uid, card.id);
      setFullCard(fullCardData);
    } catch (error) {
      console.error('Error loading flashcard:', error);
      setCardError(t('flashcards.errors.loadFailed'));
    } finally {
      setIsLoadingCard(false);
    }
  }, [user, t]);

  const handleEditCard = useCallback(async (card: FlashcardMetadata) => {
    if (!user) return;
    
    setEditCard(card);
    setIsEditLoading(true);
    setEditError(null);
    
    try {
      const fullCardData = await getFlashcard(user.uid, card.id);
      setFullEditCard(fullCardData);
      setEditValues({
        word: fullCardData.word,
        englishDefinition: fullCardData.englishDefinition,
        chineseTranslation: fullCardData.chineseTranslation,
        exampleSentence: fullCardData.exampleSentence,
        partOfSpeech: fullCardData.partOfSpeech,
        categories: fullCardData.categories,
      });
    } catch (error) {
      console.error('Error loading flashcard:', error);
      setEditError(t('flashcards.errors.loadFailed'));
    } finally {
      setIsEditLoading(false);
    }
  }, [user, t]);

  const handleCloseDialog = useCallback(() => {
    setViewCard(null);
    setFullCard(null);
    setCardError(null);
    setIsLoadingCard(false);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseDialog();
      }
    };

    if (viewCard) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [viewCard, handleCloseDialog]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleCloseEditDialog = useCallback(() => {
    setEditCard(null);
    setFullEditCard(null);
    setEditValues({});
    setEditError(null);
  }, []);

  const handleEditSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editCard) return;

    setIsEditLoading(true);
    setEditError(null);

    try {
      await updateFlashcard(user.uid, editCard.id, editValues);
      showSnackbar(t('flashcards.edit.success'), 'success');
      handleCloseEditDialog();
      refresh();
    } catch (error) {
      console.error('Error updating flashcard:', error);
      setEditError(t('flashcards.edit.error'));
    } finally {
      setIsEditLoading(false);
    }
  }, [user, editCard, editValues, t, showSnackbar, refresh]);

  const handleEditChange = useCallback((field: keyof Flashcard) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEditValues(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  }, []);

  return (
    <Container maxWidth="lg" sx={{ 
      py: { xs: 2, sm: 4 },
      touchAction: 'pan-y',
      overscrollBehavior: 'contain'
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
        <Typography variant="h4" sx={{ mb: { xs: 1, sm: 2 } }}>
          {t('flashcards.library.title')}
        </Typography>

        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          flexDirection: { xs: 'column', sm: 'row' } 
        }}>
          <TextField
            placeholder={t('flashcards.search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            fullWidth
            sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 300 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: loading ? (
                <InputAdornment position="end">
                  <CircularProgress color="inherit" size={20} />
                </InputAdornment>
              ) : null
            }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FlashcardGrid
          cards={cards}
          loading={loading}
          onView={handleViewCard}  
          onEdit={handleEditCard}
          onDelete={handleDelete}
        />

        {!loading && cards.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Box>
        )}

        {viewCard && fullCard && (
          <FlashcardOverlay
            card={fullCard}
            onClose={handleCloseDialog}
            sourceElement={sourceElement}
          />
        )}

        <Dialog
          open={!!editCard}
          onClose={handleCloseEditDialog}
          maxWidth="md"
          fullWidth
          aria-labelledby="edit-dialog-title"
        >
          <form onSubmit={handleEditSubmit}>
            <DialogTitle id="edit-dialog-title">
              {t('flashcards.edit.title')}
            </DialogTitle>
            <DialogContent>
              {editError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {editError}
                </Alert>
              )}
              {isEditLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : fullEditCard && (
                <>
                  <TextField
                    autoFocus
                    margin="dense"
                    label={t('flashcards.fields.word')}
                    type="text"
                    fullWidth
                    value={editValues.word || ''}
                    onChange={handleEditChange('word')}
                    required
                    disabled={isEditLoading}
                  />
                  <TextField
                    margin="dense"
                    label={t('flashcards.fields.partOfSpeech')}
                    type="text"
                    fullWidth
                    value={editValues.partOfSpeech || ''}
                    onChange={handleEditChange('partOfSpeech')}
                    disabled={isEditLoading}
                  />
                  <TextField
                    margin="dense"
                    label={t('flashcards.fields.englishDefinition')}
                    type="text"
                    fullWidth
                    multiline
                    rows={2}
                    value={editValues.englishDefinition || ''}
                    onChange={handleEditChange('englishDefinition')}
                    required
                    disabled={isEditLoading}
                  />
                  <TextField
                    margin="dense"
                    label={t('flashcards.fields.chineseTranslation')}
                    type="text"
                    fullWidth
                    value={editValues.chineseTranslation || ''}
                    onChange={handleEditChange('chineseTranslation')}
                    disabled={isEditLoading}
                  />
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseEditDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="contained" disabled={isEditLoading}>
                {t('common.save')}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </Container>
  );
};