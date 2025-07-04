import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, Chip, TextField, MenuItem, Slider } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { getDiaryEntry, updateDiaryEntry } from '../services/diaryService';

export const DiaryEntryPage: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<any | null>(null);
  const [fontFamily, setFontFamily] = useState('Source Serif Pro');
  const [fontSize, setFontSize] = useState(16);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user || !entryId) return;
      const data = await getDiaryEntry(user.uid, entryId);
      if (data) {
        setEntry(data);
        setTitle(data.title);
        setTagsInput(data.tags.join(', '));
        setContent(data.content);
      }
    };
    load();
  }, [user, entryId]);

  const parseTags = (input: string): string[] =>
    input
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

  const handleSave = async () => {
    if (!user || !entry) return;
    await updateDiaryEntry(user.uid, entry.id, title.trim(), content.trim(), parseTags(tagsInput));
    setEditing(false);
    setEntry({ ...entry, title, content, tags: parseTags(tagsInput) });
  };

  if (!entry) return null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button onClick={() => navigate('/diary')} sx={{ mb: 2 }}>
        {t('common.back')}
      </Button>
      {editing ? (
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
            value={content}
            onChange={e => setContent(e.target.value)}
            multiline
            minRows={6}
            fullWidth
          />
          <Button variant="contained" onClick={handleSave} disabled={!title.trim() || !content.trim()}>
            {t('common.save')}
          </Button>
          <Button onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
        </Box>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            {entry.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {entry.createdAt.toLocaleDateString()}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {entry.tags.map((tag: string) => (
              <Chip key={tag} label={tag} size="small" />
            ))}
          </Box>
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
          <Box sx={{ fontFamily, fontSize: `${fontSize}px`, mb: 2 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
          </Box>
          <Button variant="contained" onClick={() => setEditing(true)} sx={{ mr: 2 }}>
            {t('diary.editEntry')}
          </Button>
        </>
      )
    </Container>
  );
};
