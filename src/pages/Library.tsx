import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Box, Typography, Grid, Skeleton,
  Tabs, Tab, Paper, Button, Checkbox, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert
} from '@mui/material';
import ChecklistIcon from '@mui/icons-material/Checklist';
import DeleteIcon from '@mui/icons-material/Delete';
import { CategoryBrowser } from '../components/CategoryBrowser';
import { WordGrid } from '../components/WordGrid';
import {
  getCategories, getVocabularyWords, deleteFlashcards,
  deleteCategoryWithWords, categoryDocumentId, isWordInCategory
} from '../services/firestore';
import type { Category, VocabularyWord } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

type PendingDelete =
  | { kind: 'word'; word: VocabularyWord }
  | { kind: 'selection'; count: number }
  | { kind: 'category'; category: Category };

export const Library: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [view, setView] = useState<'grid' | 'category'>('grid');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  // All of the user's words are fetched once; pagination is done client-side by
  // growing the visible window. Previously "Load More" re-fetched the full
  // unpaginated list and appended it, duplicating every card on screen.
  const [allWords, setAllWords] = useState<VocabularyWord[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const ITEMS_PER_PAGE = 20;

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    severity: 'success' | 'error';
    message: string;
  } | null>(null);

  const words = useMemo(() => allWords.slice(0, visibleCount), [allWords, visibleCount]);
  const hasMore = visibleCount < allWords.length;
  const allSelected = allWords.length > 0 && selectedIds.size === allWords.length;

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [cats, initialWords] = await Promise.all([
          getCategories(user.uid),
          getVocabularyWords()
        ]);
        // Convert firestore Category to app Category type
        const appCategories: Category[] = cats.map(cat => ({
          id: cat.id || '',
          name: cat.name,
          count: cat.count
        }));
        setCategories(appCategories);
        setAllWords(initialWords);
        setVisibleCount(ITEMS_PER_PAGE);
      } catch (error) {
        console.error('Error loading library data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [user]);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (word: VocabularyWord) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(word.id)) next.delete(word.id);
      else next.add(word.id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(allWords.map(w => w.id)));
  };

  // Mirror the server-side deletion locally (words list, selection, and
  // category counters) instead of refetching the whole library.
  const removeWordsFromState = (deleted: VocabularyWord[], removedCategoryName?: string) => {
    const deletedIds = new Set(deleted.map(w => w.id));
    setAllWords(prev => prev.filter(w => !deletedIds.has(w.id)));
    setSelectedIds(prev => {
      const next = new Set([...prev].filter(id => !deletedIds.has(id)));
      return next.size === prev.size ? prev : next;
    });

    const decrements = new Map<string, number>();
    for (const word of deleted) {
      for (const name of word.categories ?? []) {
        if (!name.trim()) continue;
        const id = categoryDocumentId(name);
        decrements.set(id, (decrements.get(id) ?? 0) + 1);
      }
    }
    const removedId = removedCategoryName ? categoryDocumentId(removedCategoryName) : null;
    setCategories(prev => prev
      .filter(cat => removedId === null || categoryDocumentId(cat.name) !== removedId)
      .map(cat => ({
        ...cat,
        count: Math.max(0, cat.count - (decrements.get(categoryDocumentId(cat.name)) ?? 0))
      })));
  };

  const handleConfirmDelete = async () => {
    if (!user || !pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.kind === 'word') {
        await deleteFlashcards(user.uid, [pendingDelete.word]);
        removeWordsFromState([pendingDelete.word]);
        setSnackbar({
          severity: 'success',
          message: t('library.deleteWordSuccess', { word: pendingDelete.word.word })
        });
      } else if (pendingDelete.kind === 'selection') {
        const selectedWords = allWords.filter(w => selectedIds.has(w.id));
        await deleteFlashcards(user.uid, selectedWords);
        removeWordsFromState(selectedWords);
        exitSelectionMode();
        setSnackbar({
          severity: 'success',
          message: t('library.deleteSelectedSuccess', { count: selectedWords.length })
        });
      } else {
        // Compute the member list here and keep it stable across retries:
        // allWords only shrinks after a successful delete, so retrying a
        // partially failed deletion replays the exact same set.
        const memberWords = allWords.filter(word =>
          isWordInCategory(word, pendingDelete.category.name)
        );
        await deleteCategoryWithWords(user.uid, pendingDelete.category.name, memberWords);
        removeWordsFromState(memberWords, pendingDelete.category.name);
        setSnackbar({
          severity: 'success',
          message: t('library.deleteCategorySuccess', { name: pendingDelete.category.name })
        });
      }
      setPendingDelete(null);
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      setSnackbar({ severity: 'error', message: t('library.deleteFailed') });
    } finally {
      setDeleting(false);
    }
  };

  const dialogCopy = pendingDelete && (
    pendingDelete.kind === 'word'
      ? {
          title: t('library.confirmDeleteWordTitle'),
          body: t('library.confirmDeleteWordBody', { word: pendingDelete.word.word })
        }
      : pendingDelete.kind === 'selection'
        ? {
            title: t('library.confirmDeleteSelectedTitle', { count: pendingDelete.count }),
            body: t('library.confirmDeleteSelectedBody')
          }
        : {
            title: t('library.confirmDeleteCategoryTitle', { name: pendingDelete.category.name }),
            body: t('library.confirmDeleteCategoryBody', { count: pendingDelete.category.count })
          }
  );

  return (
    <Container maxWidth="lg" sx={{
      minHeight: '100%',
      py: { xs: 2, sm: 4 }
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3 }
      }}>
        <Typography variant="h4"
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem' },
            mb: { xs: 1, sm: 2 }
          }}
        >
          {t('library.title')}
        </Typography>

        <Paper sx={{
          mb: { xs: 2, sm: 3 },
          '& .MuiTab-root': {
            minHeight: { xs: '48px', sm: '56px' }
          }
        }}>
          <Tabs
            value={view}
            onChange={(_, newValue) => {
              setView(newValue);
              exitSelectionMode();
            }}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={t('library.gridView')} value="grid" />
            <Tab label={t('library.categories')} value="category" />
          </Tabs>
        </Paper>

        {!loading && view === 'grid' && allWords.length > 0 && (
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1
          }}>
            {selectionMode ? (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allSelected}
                      indeterminate={selectedIds.size > 0 && !allSelected}
                      onChange={toggleSelectAll}
                    />
                  }
                  label={t('library.selectAll')}
                  sx={{ mr: 0 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  {t('library.selectedCount', { count: selectedIds.size })}
                </Typography>
                <Button
                  color="error"
                  variant="contained"
                  startIcon={<DeleteIcon />}
                  disabled={selectedIds.size === 0 || deleting}
                  onClick={() => setPendingDelete({ kind: 'selection', count: selectedIds.size })}
                >
                  {t('library.deleteSelected')}
                </Button>
                <Button onClick={exitSelectionMode} disabled={deleting}>
                  {t('library.cancel')}
                </Button>
              </>
            ) : (
              <Button
                startIcon={<ChecklistIcon />}
                onClick={() => setSelectionMode(true)}
                sx={{ ml: 'auto' }}
              >
                {t('library.select')}
              </Button>
            )}
          </Box>
        )}

        {loading ? (
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {[...Array(8)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rectangular" height={200} />
              </Grid>
            ))}
          </Grid>
        ) : view === 'grid' ? (
          allWords.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
              {t('library.empty')}
            </Typography>
          ) : (
            <WordGrid
              words={words}
              onLoadMore={async () => {
                setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, allWords.length));
              }}
              hasMore={hasMore}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onDeleteWord={(word) => setPendingDelete({ kind: 'word', word })}
            />
          )
        ) : (
          <CategoryBrowser
            categories={categories}
            words={allWords}
            onDeleteCategory={(category) => setPendingDelete({ kind: 'category', category })}
            onDeleteWord={(word) => setPendingDelete({ kind: 'word', word })}
          />
        )}
      </Box>

      <Dialog
        open={!!pendingDelete}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
      >
        <DialogTitle>{dialogCopy?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogCopy?.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} disabled={deleting}>
            {t('library.cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {t('library.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
      >
        <Alert
          severity={snackbar?.severity ?? 'success'}
          onClose={() => setSnackbar(null)}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
