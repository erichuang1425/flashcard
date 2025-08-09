import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, Chip, TextField, MenuItem, Slider } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { getDiaryEntry, updateDiaryEntry } from '../services/diaryService';
import { countWords, fleschKincaidGrade, estimateReadingTime } from '../utils/writingMetrics';
import { diaryPrompts } from '../utils/diaryPrompts';
import { useUserPreferences } from '../context/UserPreferencesContext';

export const DiaryEntryPage: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const { preferences } = useUserPreferences();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const navigate = useNavigate();
  const [entry, setEntry] = useState<any | null>(null);
  const [fontFamily, setFontFamily] = useState('Source Serif Pro');
  const [fontSize, setFontSize] = useState(16);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const [promptId, setPromptId] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user || !entryId) return;
      const data = await getDiaryEntry(user.uid, entryId);
      if (data) {
        setEntry(data);
        setTitle(data.title);
        setTagsInput(data.tags.join(', '));
        setContent(data.content);
        setPromptId(data.promptId || '');
      }
    };
    load();
  }, [user, entryId]);

  const parseTags = (input: string): string[] =>
    input
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

  const readingSpeed = preferences.readingSettings?.readingSpeed || 200;

  const handleSave = async () => {
    if (!user || !entry) return;
    await updateDiaryEntry(user.uid, entry.id, title.trim(), content.trim(), parseTags(tagsInput), promptId);
    setEditing(false);
    setEntry({ ...entry, title, content, tags: parseTags(tagsInput), promptId });
  };

  const handleRandomPrompt = () => {
    const random = diaryPrompts[Math.floor(Math.random() * diaryPrompts.length)];
    setPromptId(random.id);
  };

  const selectedPromptText = diaryPrompts.find(p => p.id === promptId)?.text;

  if (!entry) return null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button onClick={() => navigate('/diary')} sx={{ mb: 2 }}>
        {t('common.back')}
      </Button>
      {editing ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              select
              label={t('diary.prompt.label')}
              value={promptId}
              onChange={e => setPromptId(e.target.value)}
              sx={{ flexGrow: 1 }}
            >
              <MenuItem value="">{t('diary.prompt.none')}</MenuItem>
              {diaryPrompts.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  {p.text}
                </MenuItem>
              ))}
            </TextField>
            <Button onClick={handleRandomPrompt}>{t('diary.prompt.random')}</Button>
          </Box>
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
          {selectedPromptText && (
            <Typography variant="body2" color="text.secondary">
              {selectedPromptText}
            </Typography>
          )}
          <TextField
            value={content}
            onChange={e => setContent(e.target.value)}
            multiline
            minRows={6}
            fullWidth
          />
          <Typography variant="body2" color="text.secondary">
            {t('diary.metrics.wordCount')}: {countWords(content)} · {t('diary.metrics.readingLevel')}: {fleschKincaidGrade(content).toFixed(1)} · {t('diary.metrics.readingTime', { values: { minutes: estimateReadingTime(content, readingSpeed) } })}
          </Typography>
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
          {selectedPromptText && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {selectedPromptText}
            </Typography>
          )}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              mb: 2,
              alignItems: 'center',
              flexDirection: isMobile && isPortrait ? 'column' : 'row'
            }}
          >
            <TextField
              select
              label={t('diary.fields.font')}
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value)}
              sx={{ width: isMobile && isPortrait ? '100%' : 150 }}
            >
              <MenuItem value="Source Serif Pro">Source Serif Pro</MenuItem>
              <MenuItem value="Roboto">Roboto</MenuItem>
              <MenuItem value="Noto Serif">Noto Serif</MenuItem>
              <MenuItem value="Crimson Pro">Crimson Pro</MenuItem>
            </TextField>
            <Box sx={{ display: 'flex', alignItems: 'center', width: isMobile && isPortrait ? '100%' : 160 }}>
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('diary.metrics.wordCount')}: {countWords(entry.content)} · {t('diary.metrics.readingLevel')}: {fleschKincaidGrade(entry.content).toFixed(1)} · {t('diary.metrics.readingTime', { values: { minutes: estimateReadingTime(entry.content, readingSpeed) } })}
          </Typography>
          <Button variant="contained" onClick={() => setEditing(true)} sx={{ mr: 2 }}>
            {t('diary.editEntry')}
          </Button>
        </>
      )}
    </Container>
  );
};
