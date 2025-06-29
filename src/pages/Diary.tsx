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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import {
  addDiaryEntry,
  getDiaryEntries,
  updateDiaryEntry,
  deleteDiaryEntry
} from '../services/diaryService';
import type { DiaryEntry } from '../types';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useConfirm } from '../context/ConfirmContext';
import { useSnackbar } from '../hooks/useSnackbar';

export const Diary: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [content, setContent] = useState('');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();

  const loadEntries = async () => {
    if (!user) return;
    setLoading(true);
    const data = await getDiaryEntries(user.uid);
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
  }, [user]);

  const handleSave = async () => {
    if (!user || !content.trim()) return;
    await addDiaryEntry(user.uid, content.trim());
    setContent('');
    loadEntries();
  };

  const handleEdit = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setEditContent(entry.content);
  };

  const handleEditSave = async () => {
    if (!user || !editingEntry) return;
    try {
      await updateDiaryEntry(user.uid, editingEntry.id, editContent.trim());
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
      <Typography variant="h4" sx={{ mb: 2 }}>
        {t('diary.title')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <TextField
          label={t('diary.newEntry')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          fullWidth
          multiline
          minRows={3}
        />
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!content.trim() || loading}
        >
          {t('common.save')}
        </Button>
      </Box>
      <Grid container spacing={2}>
        {entries.map((entry) => (
          <Grid item xs={12} sm={6} md={4} key={entry.id}>
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
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {entry.content}
                </Typography>
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
          <Button variant="contained" onClick={handleEditSave} disabled={!editContent.trim()}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
