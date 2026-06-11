import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NotesIcon from '@mui/icons-material/Notes';
import SettingsIcon from '@mui/icons-material/Settings';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useReadingMode } from '../../context/ReadingModeContext';
import { useFullscreen } from '../../hooks/useFullscreen';
import { getRandomArticle } from '../../services/articleService';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { DictionaryLookup } from './DictionaryLookup';
import { NoteSystem } from './NoteSystem';
import { ReadingSettingsDialog } from './ReadingSettingsDialog';
import { articleTitle } from '../../i18n/articleLabels';

const selectedText = () => window.getSelection()?.toString().trim() ?? '';

export const ReadingInterface: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const {
    currentArticle,
    setCurrentArticle,
    startReading,
    stopReading,
    updateProgress,
    readingSettings,
  } = useReadingMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toggleFullscreen } = useFullscreen(containerRef);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [dictionaryWord, setDictionaryWord] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    startReading();
    return () => {
      stopReading();
      if (progressTimer.current) clearTimeout(progressTimer.current);
      window.speechSynthesis?.cancel();
    };
  }, [startReading, stopReading]);

  if (!currentArticle?.content) return null;

  const paragraphs = currentArticle.content
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const themeColors =
    readingSettings.theme === 'dark'
      ? { background: '#1c1b1a', color: '#f5f2ed' }
      : readingSettings.theme === 'sepia'
        ? { background: '#f4ecd8', color: '#4b3b2b' }
        : { background: '#fff', color: 'text.primary' };

  const handleScroll = () => {
    const element = containerRef.current;
    if (!element) return;
    const scrollable = element.scrollHeight - element.clientHeight;
    const progress =
      scrollable <= 0 ? 100 : Math.round((element.scrollTop / scrollable) * 100);
    const wordsRead = Math.round(
      currentArticle.wordCount * (progress / 100)
    );

    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => {
      void updateProgress({
        progress,
        wordsRead,
        lastPosition: element.scrollTop,
      });
    }, 500);
  };

  const openDictionary = () => {
    const selection = selectedText();
    if (selection && selection.split(/\s+/).length === 1) {
      setDictionaryWord(selection.replace(/[^\p{L}\p{N}'’-]/gu, ''));
      setMessage('');
    } else {
      setMessage(t('reading.reader.selectWord'));
    }
  };

  const openNotes = () => {
    const selection = selectedText();
    if (selection) {
      setNoteText(selection);
      setMessage('');
    } else {
      setMessage(t('reading.reader.selectText'));
    }
  };

  const speak = () => {
    if (!readingSettings.enableTTS) {
      setMessage(t('reading.reader.enableTts'));
      return;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(
      new SpeechSynthesisUtterance(currentArticle.content)
    );
  };

  const randomArticle = async () => {
    if (!user) return;
    const article = await getRandomArticle(user.uid);
    if (article) setCurrentArticle(article);
  };

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      sx={{
        height: '100%',
        overflowY: 'auto',
        bgcolor: themeColors.background,
        color: themeColors.color,
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          bgcolor: themeColors.background,
          borderBottom: 1,
          borderColor: 'divider',
          px: 2,
          py: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title={t('reading.reader.back')}>
            <IconButton onClick={() => setCurrentArticle(null)}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography noWrap sx={{ flex: 1, fontWeight: 600 }}>
            {articleTitle(currentArticle, t)}
          </Typography>
          <Tooltip title={t('reading.reader.dictionary')}>
            <IconButton onClick={openDictionary}><MenuBookIcon /></IconButton>
          </Tooltip>
          <Tooltip title={t('reading.reader.notes')}>
            <IconButton onClick={openNotes}><NotesIcon /></IconButton>
          </Tooltip>
          <Tooltip title={t('reading.reader.speak')}>
            <IconButton onClick={speak}><VolumeUpIcon /></IconButton>
          </Tooltip>
          <Tooltip title={t('reading.reader.random')}>
            <IconButton onClick={() => void randomArticle()}><ShuffleIcon /></IconButton>
          </Tooltip>
          <Tooltip title={t('reading.reader.fullscreen')}>
            <IconButton onClick={() => void toggleFullscreen()}><FullscreenIcon /></IconButton>
          </Tooltip>
          <Tooltip title={t('reading.reader.settings')}>
            <IconButton onClick={() => setSettingsOpen(true)}><SettingsIcon /></IconButton>
          </Tooltip>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={currentArticle.progress.progress}
          sx={{ mt: 1 }}
        />
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
        {message ? <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert> : null}
        <Paper
          elevation={readingSettings.theme === 'light' ? 1 : 0}
          sx={{
            p: { xs: 3, sm: 5, md: 7 },
            bgcolor: themeColors.background,
            color: themeColors.color,
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom>
            {articleTitle(currentArticle, t)}
          </Typography>
          {currentArticle.subtitle ? (
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              {currentArticle.subtitle}
            </Typography>
          ) : null}
          <Box
            sx={{
              fontFamily: readingSettings.fontFamily,
              fontSize: `${readingSettings.fontSize}px`,
              lineHeight: readingSettings.lineHeight,
              '& p': { mb: 2.5 },
            }}
          >
            {paragraphs.map((paragraph, index) => (
              <Typography
                component="p"
                sx={{ font: 'inherit', color: 'inherit' }}
                key={`${index}-${paragraph.slice(0, 20)}`}
              >
                {paragraph}
              </Typography>
            ))}
          </Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() =>
              void updateProgress({
                completed: true,
                progress: 100,
                wordsRead: currentArticle.wordCount,
              })
            }
          >
            {t('reading.reader.complete')}
          </Button>
        </Paper>
      </Container>

      <ReadingSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <DictionaryLookup
        word={dictionaryWord}
        open={Boolean(dictionaryWord)}
        onClose={() => setDictionaryWord('')}
      />
      <NoteSystem
        articleId={currentArticle.id}
        selectedText={noteText}
        open={Boolean(noteText)}
        onClose={() => setNoteText('')}
      />
    </Box>
  );
};
