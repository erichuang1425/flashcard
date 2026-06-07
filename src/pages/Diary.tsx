import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  IconButton,
  Box,
  Chip,
  Stack,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../context/AuthContext';
import {
  addDiaryEntry,
  getDiaryEntries,
  updateDiaryEntry,
  deleteDiaryEntry,
  getSuggestedVocabulary
} from '../services/firestore';
import type { DiaryEntry, Flashcard } from '../types';

const WRITING_PROMPTS = [
  'Write about something that challenged you today.',
  'Describe a conversation that made you think differently.',
  'What are you grateful for this week?',
  'Detail a goal you want to accomplish and why.',
];

export const Diary: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Flashcard[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [usedWords, setUsedWords] = useState<string[]>([]);

  useEffect(() => {
    const loadEntries = async () => {
      if (!user) return;
      const data = await getDiaryEntries(user.uid);
      setEntries(data);
    };
    loadEntries();
  }, [user]);

  const handleAdd = async () => {
    if (!user || !text.trim()) return;
    const newEntry: Omit<DiaryEntry, 'id'> = {
      userId: user.uid,
      text,
      createdAt: new Date(),
      ...(usedWords.length > 0 ? { usedWords } : {}),
    };
    const id = await addDiaryEntry(newEntry);
    setEntries([{ id, ...newEntry }, ...entries]);
    setText('');
    setUsedWords([]);
    setOpen(false);
  };

  const handleOpenNew = async () => {
    setPrompt(WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)]);
    setUsedWords([]);
    setShowSuggestions(true);
    setOpen(true);
    if (user) {
      try {
        const words = await getSuggestedVocabulary(user.uid, 6);
        setSuggestions(words);
      } catch (err) {
        setSuggestions([]);
      }
    }
  };

  const handleInsertWord = (word: string) => {
    setText(prev => (prev.trim() ? `${prev.trimEnd()} ${word}` : word));
    setUsedWords(prev => (prev.includes(word) ? prev : [...prev, word]));
  };

  const handleEdit = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setEditingText(entry.text);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!user || !editingId) return;
    await updateDiaryEntry(user.uid, editingId, editingText);
    setEntries(entries.map(e => e.id === editingId ? { ...e, text: editingText } : e));
    setEditOpen(false);
  };

  const handleDelete = async (entryId: string) => {
    if (!user) return;
    await deleteDiaryEntry(user.uid, entryId);
    setEntries(entries.filter(e => e.id !== entryId));
  };

  return (
    <Container sx={{ py: 4 }}>
      <Grid container spacing={2}>
        {entries.map((entry) => (
          <Grid item xs={12} sm={6} md={4} key={entry.id}>
            <Card sx={{ position: 'relative' }}>
              {entry.imageUrl && (
                <CardMedia
                  component="img"
                  height="140"
                  image={entry.imageUrl}
                  alt="diary"
                />
              )}
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {entry.createdAt instanceof Date
                    ? entry.createdAt.toLocaleDateString()
                    : new Date(entry.createdAt).toLocaleDateString()}
                </Typography>
                <Typography variant="body1">
                  {entry.text}
                </Typography>
              </CardContent>
              <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                <IconButton size="small" onClick={() => handleEdit(entry)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleDelete(entry.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Fab
        color="primary"
        onClick={handleOpenNew}
        sx={{ position: 'fixed', bottom: 32, right: 32 }}
      >
        <AddIcon />
      </Fab>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>New Diary Entry</DialogTitle>
        <DialogContent>
          {prompt && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {prompt}
            </Typography>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Use these words you&apos;re studying:
                </Typography>
                <IconButton size="small" onClick={() => setShowSuggestions(false)} aria-label="Dismiss suggestions">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {suggestions.map((card) => (
                  <Tooltip key={card.id} title={card.englishDefinition} arrow>
                    <Chip
                      label={card.word}
                      onClick={() => handleInsertWord(card.word)}
                      color={usedWords.includes(card.word) ? 'primary' : 'default'}
                      variant={usedWords.includes(card.word) ? 'filled' : 'outlined'}
                      size="small"
                    />
                  </Tooltip>
                ))}
              </Stack>
            </Box>
          )}
          <TextField
            multiline
            fullWidth
            minRows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            label="What happened today?"
          />
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Word count: {text.trim() ? text.trim().split(/\s+/).length : 0}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Edit Entry</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            minRows={4}
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            label="Update your entry"
          />
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Word count: {editingText.trim() ? editingText.trim().split(/\s+/).length : 0}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

