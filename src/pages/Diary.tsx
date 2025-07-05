import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  MenuItem
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import {
  getDiaryEntries,
  updateDiaryEntry,
  deleteDiaryEntry
} from '../services/diaryService';
import type { DiaryEntry } from '../types';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useConfirm } from '../context/ConfirmContext';
import { useSnackbar } from '../hooks/useSnackbar';
import { useDebounce } from '../hooks/useDebounce';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { countWords, estimateReadingTime } from '../utils/writingMetrics';


export const Diary: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editContent, setEditContent] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const { preferences } = useUserPreferences();
  const [fontFamily, setFontFamily] = useState('Source Serif Pro');
  const [fontSize, setFontSize] = useState(16);
  const readingSpeed = preferences.readingSettings?.readingSpeed || 200;

  const parseTags = (input: string): string[] =>
    input
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

  const loadEntries = async () => {
    if (!user) return;
    setLoading(true);
    const data = await getDiaryEntries(user.uid);
    setEntries(data);
    setLoading(false);
  };

  const filteredEntries = React.useMemo(() => {
    if (!debouncedSearch) return entries;
    const term = debouncedSearch.toLowerCase();
    return entries.filter(e =>
      e.title.toLowerCase().includes(term) ||
      e.content.toLowerCase().includes(term) ||
      e.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }, [entries, debouncedSearch]);

  useEffect(() => {
    loadEntries();
  }, [user]);


  const handleEdit = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditTagsInput(entry.tags.join(', '));
    setEditContent(entry.content);
  };

  const handleEditSave = async () => {
    if (!user || !editingEntry) return;
    try {
      await updateDiaryEntry(
        user.uid,
        editingEntry.id,
        editTitle.trim(),
        editContent.trim(),
        parseTags(editTagsInput)
      );
      setEditingEntry(null);
      showSnackbar(t('diary.edit.success'), 'success');
      loadEntries();
    } catch (error) {
      console.error('Edit failed:', error);
      showSnackbar(t('diary.edit.error'), 'error');
    }
  };

  const handleDelete = async (entry: DiaryEntry) => {
    if (!user) return;
    const confirmed = await confirm({
      title: t('diary.delete.confirmTitle'),
      message: t('diary.delete.confirmMessage'),
      confirmText: t('common.delete'),
      confirmColor: 'error'
    });
    if (!confirmed) return;

    try {
      await deleteDiaryEntry(user.uid, entry.id);
      showSnackbar(t('diary.delete.success'), 'success');
      loadEntries();
    } catch (error) {
      console.error('Delete failed:', error);
      showSnackbar(t('diary.delete.error'), 'error');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">{t('diary.title')}</Typography>
        <Button variant="contained" component={Link} to="/diary/new">
          {t('diary.newEntry')}
        </Button>
      </Box>
      <TextField
          label={t('diary.search.placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <TextField
            select
            label={t('diary.fields.font')}
            value={fontFamily}
            onChange={e => setFontFamily(e.target.value)}
            sx={{ width: 150 }}
          >
            <MenuItem value="Source Serif Pro">Source Serif Pro</MenuItem>
            <MenuItem value="Roboto">Roboto</MenuItem>
            <MenuItem value="Noto Serif">Noto Serif</MenuItem>
            <MenuItem value="Crimson Pro">Crimson Pro</MenuItem>
          </TextField>
          <Box sx={{ display: 'flex', alignItems: 'center', width: 160 }}>
            <Typography sx={{ mr: 1 }}>{t('diary.fields.fontSize')}</Typography>
            <Slider
              size="small"
              value={fontSize}
              min={12}
              max={24}
              onChange={(_, v) => setFontSize(v as number)}
            />
          </Box>
        </Box>
        <Grid container spacing={2}>
          {filteredEntries.map((entry) => (
            <Grid item xs={isMobile && isLandscape ? 6 : 12} sm={6} md={4} key={entry.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {entry.createdAt.toLocaleDateString()}
                    </Typography>
                    <Box>
                      <IconButton size="small" onClick={() => handleEdit(entry)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(entry)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {entry.title}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    {entry.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                  <Box sx={{ fontFamily, fontSize: `${fontSize}px` }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('diary.metrics.wordCount')}: {countWords(entry.content)} · {t('diary.metrics.readingTime', { values: { minutes: estimateReadingTime(entry.content, readingSpeed) } })}
                  </Typography>
                  <Button component={Link} to={`/diary/${entry.id}`} size="small">
                    {t('diary.viewEntry')}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      <Dialog
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('diary.editEntry')}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('diary.fields.title')}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('diary.fields.tags')}
            helperText={t('diary.fields.tagsHelp')}
            value={editTagsInput}
            onChange={e => setEditTagsInput(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingEntry(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={handleEditSave} disabled={!editTitle.trim() || !editContent.trim()}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
