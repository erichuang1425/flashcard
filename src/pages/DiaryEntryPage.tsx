import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, Chip, TextField, MenuItem, Slider } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { getDiaryEntry, updateDiaryEntry } from '../services/diaryService';
import { getRecentOrDueFlashcards } from '../services/flashcardService';
import { countWords, fleschKincaidGrade, estimateReadingTime } from '../utils/writingMetrics';
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
  const [suggestedWords, setSuggestedWords] = useState<{ id: string; word: string }[]>([]);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user || !entryId) return;
      const data = await getDiaryEntry(user.uid, entryId);
      if (data) {
        setEntry(data);
        setTitle(data.title);
        setTagsInput(data.tags.join(', '));
        setContent(data.content);
        setUsedWords(data.usedWords || []);
      }
    };
    load();
  }, [user, entryId]);

  useEffect(() => {
    const loadSuggestions = async () => {
      if (!user) return;
      const words = await getRecentOrDueFlashcards(user.uid, 10);
      setSuggestedWords(words);
    };
    loadSuggestions();
  }, [user]);

  const parseTags = (input: string): string[] =>
    input
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

  const readingSpeed = preferences.readingSettings?.readingSpeed || 200;

  const handleSave = async () => {
    if (!user || !entry) return;
    await updateDiaryEntry(user.uid, entry.id, title.trim(), content.trim(), parseTags(tagsInput), usedWords);
    setEditing(false);
    setEntry({ ...entry, title, content, tags: parseTags(tagsInput), usedWords });
  };

  const insertWord = (word: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = content.slice(0, start) + word + content.slice(end);
    setContent(newValue);
    const newPos = start + word.length;
    setTimeout(() => {
      textarea.setSelectionRange(newPos, newPos);
      textarea.focus();
    }, 0);
    setUsedWords(prev => (prev.includes(word) ? prev : [...prev, word]));
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
            inputRef={contentRef}
          />
          {suggestedWords.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('diary.useWords')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {suggestedWords.map(s => (
                  <Chip key={s.id} label={s.word} onClick={() => insertWord(s.word)} />
                ))}
              </Box>
            </Box>
          )}
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
          {entry.usedWords?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('diary.useWords')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {entry.usedWords.map((w: string) => (
                  <Chip key={w} label={w} size="small" />
                ))}
              </Box>
            </Box>
          )}
          <Button variant="contained" onClick={() => setEditing(true)} sx={{ mr: 2 }}>
            {t('diary.editEntry')}
          </Button>
        </>
      )}
    </Container>
  );
};
