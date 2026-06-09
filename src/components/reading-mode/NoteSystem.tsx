import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { ArticleNote } from '../../types/reading';
import { useI18n } from '../../i18n/I18nContext';

interface NoteSystemProps {
  articleId: string;
  selectedText: string;
  open: boolean;
  onClose: () => void;
}

export const NoteSystem: React.FC<NoteSystemProps> = ({
  articleId,
  selectedText,
  open,
  onClose,
}) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [notes, setNotes] = useState<ArticleNote[]>([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('general');

  useEffect(() => {
    if (!user || !articleId) return;
    void getDoc(
      doc(db, 'users', user.uid, 'articles', articleId, 'notes', 'all')
    ).then((snapshot) => {
      if (snapshot.exists()) {
        setNotes((snapshot.data().notes as ArticleNote[]) ?? []);
      }
    });
  }, [articleId, user]);

  const persist = async (nextNotes: ArticleNote[]) => {
    if (!user) return;
    await setDoc(
      doc(db, 'users', user.uid, 'articles', articleId, 'notes', 'all'),
      { notes: nextNotes }
    );
    setNotes(nextNotes);
  };

  const save = async () => {
    if (!text.trim() || !selectedText) return;
    const note: ArticleNote = {
      id: crypto.randomUUID(),
      text: text.trim(),
      highlight: selectedText,
      category: category.trim() || 'general',
      timestamp: Date.now(),
    };
    await persist([...notes, note]);
    setText('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('reading.notes.title')}</DialogTitle>
      <DialogContent>
        <Typography
          component="blockquote"
          color="text.secondary"
          sx={{ borderLeft: 3, borderColor: 'primary.main', pl: 2, my: 2 }}
        >
          {selectedText}
        </Typography>
        <Stack spacing={2}>
          <TextField
            multiline
            minRows={3}
            label={t('reading.notes.note')}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <TextField
            label={t('reading.notes.category')}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          {notes.map((note) => (
            <Box key={note.id} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Chip size="small" label={note.category} />
                <IconButton
                  size="small"
                  onClick={() =>
                    void persist(notes.filter((item) => item.id !== note.id))
                  }
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {note.highlight}
              </Typography>
              <Typography>{note.text}</Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={() => void save()} disabled={!text.trim()}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
