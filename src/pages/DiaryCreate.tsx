import React, { useState } from 'react';
import { Container, Typography, Box, TextField, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { addDiaryEntry } from '../services/diaryService';
import { useNavigate } from 'react-router-dom';

export const DiaryCreate: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const parseTags = (input: string): string[] =>
    input
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

  const handleSave = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setLoading(true);
    await addDiaryEntry(
      user.uid,
      title.trim(),
      content.trim(),
      parseTags(tagsInput)
    );
    setTitle('');
    setContent('');
    setTagsInput('');
    setLoading(false);
    navigate('/diary');
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {t('diary.createPageTitle')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label={t('diary.fields.title')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          fullWidth
        />
        <TextField
          label={t('diary.fields.tags')}
          helperText={t('diary.fields.tagsHelp')}
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          fullWidth
        />
        <TextField
          label={t('diary.newEntry')}
          value={content}
          onChange={e => setContent(e.target.value)}
          fullWidth
          multiline
          minRows={6}
          helperText={t('diary.markdownHelp')}
        />
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!title.trim() || !content.trim() || loading}
        >
          {t('common.save')}
        </Button>
      </Box>
    </Container>
  );
};
