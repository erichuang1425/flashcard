import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Chip,
  Typography,
  IconButton
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import DeleteIcon from '@mui/icons-material/Delete';
import { useI18n } from '../../i18n/I18nContext';

interface Props {
  articleId: string;
  selectedText: string;
  open: boolean;
  onClose: () => void;
}

interface Note {
  id: string;
  text: string;
  highlight: string;
  category: string;
  timestamp: number;
}

export const NoteSystem: React.FC<Props> = ({
  articleId,
  selectedText,
  open,
  onClose
}) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [articleId]);

  useEffect(() => {
    if (open && selectedText) {
      setNoteText('');
    }
  }, [open, selectedText]);

  const loadNotes = async () => {
    if (!user || !articleId) return;
    
    const notesDoc = await getDoc(doc(db, 'users', user.uid, 'articles', articleId, 'notes', 'all'));
    if (notesDoc.exists()) {
      setNotes(notesDoc.data().notes || []);
    }
  };

  const saveNote = async () => {
    if (!user || !articleId || !selectedText) return;
    setLoading(true);

    try {
      const newNote: Note = {
        id: Date.now().toString(),
        text: noteText,
        highlight: selectedText,
        category: category || 'general',
        timestamp: Date.now()
      };

      const updatedNotes = [...notes, newNote];
      await setDoc(doc(db, 'users', user.uid, 'articles', articleId, 'notes', 'all'), {
        notes: updatedNotes
      });

      setNotes(updatedNotes);
      setNoteText('');
      setCategory('');
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!user || !articleId) return;

    try {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      await setDoc(doc(db, 'users', user.uid, 'articles', articleId, 'notes', 'all'), {
        notes: updatedNotes
      });
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('reading.tools.notes')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('reading.tools.selectedText')}:
          </Typography>
          <Typography variant="body1" component="blockquote" sx={{ 
            borderLeft: 3,
            borderColor: 'primary.main',
            pl: 2,
            py: 1
          }}>
            {selectedText}
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          label={t('reading.tools.noteInput')}
          variant="outlined"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          label={t('reading.tools.category')}
          variant="outlined"
          size="small"
        />

        {notes.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('reading.tools.previousNotes')}
            </Typography>
            {notes.map((note) => (
              <Box
                key={note.id}
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'background.default'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Chip size="small" label={note.category} color="primary" variant="outlined" />
                  <IconButton size="small" onClick={() => deleteNote(note.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {note.highlight}
                </Typography>
                <Typography variant="body1">
                  {note.text}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button 
          onClick={saveNote} 
          variant="contained" 
          disabled={!noteText.trim() || loading}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
