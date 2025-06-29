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
  Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../context/AuthContext';
import { addDiaryEntry, getDiaryEntries } from '../services/firestore';
import type { DiaryEntry } from '../types';

export const Diary: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

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
    };
    const id = await addDiaryEntry(newEntry);
    setEntries([{ id, ...newEntry }, ...entries]);
    setText('');
    setOpen(false);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Grid container spacing={2}>
        {entries.map((entry) => (
          <Grid item xs={12} sm={6} md={4} key={entry.id}>
            <Card>
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
            </Card>
          </Grid>
        ))}
      </Grid>

      <Fab
        color="primary"
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', bottom: 32, right: 32 }}
      >
        <AddIcon />
      </Fab>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>New Diary Entry</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            minRows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            label="What happened today?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

