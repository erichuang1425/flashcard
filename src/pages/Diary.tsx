import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { addDiaryEntry, getDiaryEntries } from '../services/diaryService';
import type { DiaryEntry } from '../types';

export const Diary: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [content, setContent] = useState('');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);

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
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {entry.createdAt.toLocaleDateString()}
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {entry.content}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
