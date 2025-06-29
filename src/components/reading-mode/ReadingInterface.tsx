import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  LinearProgress,
  IconButton,
  Tooltip,
  Fade,
  Stack,
  CircularProgress,
  Fab,
  Pagination,
  Snackbar,
  Alert,
  Button,
  Collapse
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import NotesIcon from '@mui/icons-material/Notes';
import { useReadingMode } from '../../context/ReadingModeContext';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { ReadingSpeedTracker } from './ReadingSpeedTracker';
import { DictionaryLookup } from './DictionaryLookup';
import { NoteSystem } from './NoteSystem';
import { motion } from 'framer-motion';
import { Paper3D } from '../common/Paper3D';
import { ReadingAchievementPopup } from './ReadingAchievementPopup';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ErrorBoundary } from '../ErrorBoundary';
import { logger } from '../../services/logging';
import { sanitizeText, isValidText } from '../../utils/textSanitizer';
import { useAuth } from '../../context/AuthContext';
import { getRandomArticle } from '../../services/articleService';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme, alpha } from '@mui/material/styles';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { MobileDictionaryLookup } from './MobileDictionaryLookup';
import { MobileContextMenu } from './MobileContextMenu';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { ReadingSettingsDialog } from './ReadingSettingsDialog';
import { useI18n } from '../../i18n/I18nContext';
import SettingsIcon from '@mui/icons-material/Settings';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import FormatLineSpacingIcon from '@mui/icons-material/FormatLineSpacing';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import { getFlashcardMetadata } from '../../services/firestore';
import { FlashcardCounter } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAudio } from '../../hooks/useAudio';
import { useUIState } from '../../context/UIStateContext';

const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const isElementInViewportCenter = (element: HTMLElement, threshold = 150) => {
  const windowHeight = window.innerHeight;
  const rect = element.getBoundingClientRect();
  const elementCenter = rect.top + (rect.height / 2);
  const viewportCenter = windowHeight / 2;
  
  const absoluteCenter = window.scrollY + viewportCenter;
  const elementAbsoluteCenter = window.scrollY + elementCenter;
  
  return Math.abs(viewportCenter - elementCenter) < threshold;
};

export const ReadingInterface: React.FC = () => {
  const { user } = useAuth();
  const { currentArticle, readingProgress, updateProgress, isReading, setCurrentArticle } = useReadingMode();
  const { preferences, setPreferences } = useUserPreferences();
  const { uiState, toggleFullscreen, toggleFocusMode } = useUIState();
  const { focusMode, fullscreen } = uiState;
  const [activeParagraph, setActiveParagraph] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [dictAnchorEl, setDictAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedPages, setLoadedPages] = useState<{ [key: number]: string[] }>({});
  const [achievement, setAchievement] = useState<string | null>(null);
  const PARAGRAPHS_PER_PAGE = 50;
  const [renderedPages, setRenderedPages] = useState<number[]>([]);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileDict, setMobileDict] = useState<{
    open: boolean;
    word: string;
    definition: WordDefinition | null;
    isLoading: boolean;
    error: string | null;
  }>({
    open: false,
    word: '',
    definition: null,
    isLoading: false,
    error: null
  });
  const [definition, setDefinition] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [translation, setTranslation] = useState<string | null>(null);
  const [showCompletionAlert, setShowCompletionAlert] = useState(false);
  const COMPLETION_THRESHOLD = 0.9;
  const [textSettingsOpen, setTextSettingsOpen] = useState(false);
  const { t } = useI18n();
  const [metadata, setMetadata] = useState<FlashcardCounter | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const { playSound } = useAudio();
  const [centeredParagraphIndex, setCenteredParagraphIndex] = useState<number>(-1);
  const [visibleParagraphs, setVisibleParagraphs] = useState<Set<number>>(new Set());
  
  useEffect(() => {
    const loadMetadata = async () => {
      if (!user) return;
      try {
        const data = await getFlashcardMetadata(user.uid);
        if (!data) return;
        setMetadata(data);
        setCategories(Object.keys(data.categories || {}));
      } catch (err) {
        logger.error('Failed to load metadata:', err as Error);
      }
    };
    loadMetadata();
  }, [user]);

  const handleCategoryUpdate = async (newCategory: string) => {
    try {
      if (!user) return;
      if (metadata && !metadata.categories[newCategory]) {
        const updatedCategories = {
          ...metadata.categories,
          [newCategory]: Object.keys(metadata.categories).length
        };
        await updateDoc(doc(db, 'users', user.uid, 'counters', 'flashcards'), {
          categories: updatedCategories
        });
      }
    } catch (err) {
      logger.error('Failed to update categories', err as Error);
    }
  };

  const handleFontSize = (increment: number) => {
    setPreferences(prev => ({
      ...prev,
      readingSettings: {
        ...prev.readingSettings,
        fontSize: Math.min(Math.max(12, (prev.readingSettings?.fontSize || 16) + increment), 32)
      }
    }));
  };

  const handleLineHeight = (increment: number) => {
    setPreferences(prev => ({
      ...prev,
      readingSettings: {
        ...prev.readingSettings,
        lineHeight: Math.min(Math.max(1, (prev.readingSettings?.lineHeight || 1.6) + increment), 3)
      }
    }));
  };

  const handleFontChange = () => {
    const fonts = [
      'system-ui',
      'Georgia',
      'Merriweather',
      'Source Serif Pro',
      'Crimson Pro',
      'Noto Serif',
      'IBM Plex Serif',
      'Times New Roman',
      'Lora',
      'PT Serif'
    ];
    setPreferences(prev => {
      const currentIndex = fonts.indexOf(prev.readingSettings?.fontFamily || 'system-ui');
      const nextIndex = (currentIndex + 1) % fonts.length;
      return {
        ...prev,
        readingSettings: {
          ...prev.readingSettings,
          fontFamily: fonts[nextIndex]
        }
      };
    });
  };

  const handleRandomArticle = async () => {
    if (!user) return;
    try {
      const article = await getRandomArticle(user.uid);
      if (article) {
        setCurrentArticle(article);
      }
    } catch (err) {
      logger.error('Failed to get random article', err as Error);
    }
  };

  const {
    readingSettings: {
      fontSize = 16,
      lineHeight = 1.6,
      fontFamily = 'system-ui',
      enableTTS = false,
      focusModeEnabled = false,
    } = {}
  } = preferences || {};

  useEffect(() => {
    if (focusMode) {
      toggleFocusMode();
    }
  }, []);

  useEffect(() => {
    if (focusModeEnabled !== focusMode) {
      toggleFocusMode();
    }
  }, [focusModeEnabled, focusMode, toggleFocusMode]);

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  const paragraphRefs = useRef<Map<number, HTMLElement>>(new Map());

  const [scrollInfo, setScrollInfo] = useState({
    position: 0,
    direction: 'none' as 'up' | 'down' | 'none',
    speed: 0
  });

  const handleTextToSpeech = async (text: string) => {
    if (!enableTTS) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text || !isValidText(text)) return;

    if (text.split(/\s+/).length === 1) {
      setSelectedWord(sanitizeText(text));
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const fakeAnchor = document.createElement('div');
      fakeAnchor.style.position = 'absolute';
      fakeAnchor.style.left = `${rect.left}px`;
      fakeAnchor.style.top = `${rect.bottom}px`;
      document.body.appendChild(fakeAnchor);
      setDictAnchorEl(fakeAnchor);
      setTimeout(() => document.body.removeChild(fakeAnchor), 100);
    }
  };

  const handleKeyShortcut = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (text && text.split(/\s+/).length > 1 && isValidText(text)) {
        setSelectedText(sanitizeText(text));
        setNotesOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keydown', handleKeyShortcut);
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('keydown', handleKeyShortcut);
    };
  }, [handleKeyShortcut]);

  useEffect(() => {
    if (!currentArticle?.content) return;
    let mounted = true;

    const loadPage = async (pageNum: number) => {
      if (loadedPages[pageNum]) return;

      if (!currentArticle?.content) return;
      const allParagraphs = currentArticle.content.split('\n');
      const start = pageNum * PARAGRAPHS_PER_PAGE;
      const end = start + PARAGRAPHS_PER_PAGE;
    };
  }, []);

  useEffect(() => {
    if (!currentArticle?.content) return;
    let mounted = true;

    const loadPage = async (pageNum: number) => {
      if (loadedPages[pageNum]) return;

      if (!currentArticle?.content) return;
      const allParagraphs = currentArticle.content.split('\n');
      const start = pageNum * PARAGRAPHS_PER_PAGE;
      const end = start + PARAGRAPHS_PER_PAGE;

      if (mounted) {
        setLoadedPages(prev => ({
          ...prev,
          [pageNum]: allParagraphs.slice(start, end)
        }));
      }
    };

    loadPage(currentPage);
    loadPage(currentPage + 1);

    return () => {
      mounted = false;
    };
  }, [currentArticle, currentPage, loadedPages]);

  useEffect(() => {
    if (!currentArticle?.content || isInitialized) return;

    const initializeContent = async () => {
      try {
        setIsContentLoading(true);
        const paragraphs = currentArticle?.content
          ?.split('\n')
          ?.map(p => p.trim())
          ?.filter(p => p.length > 0) ?? [];

        const initialPages = {
          0: paragraphs.slice(0, PARAGRAPHS_PER_PAGE),
          1: paragraphs.slice(PARAGRAPHS_PER_PAGE, PARAGRAPHS_PER_PAGE * 2)
        };

        setLoadedPages(initialPages);
        setRenderedPages([0, 1]);
        setIsInitialized(true);
      } catch (error) {
        logger.error('Failed to initialize content', error as Error);
      } finally {
        setIsContentLoading(false);
      }
    };

    initializeContent();
  }, [currentArticle?.content, isInitialized]);

  const updateVisiblePages = useCallback(() => {
    if (!containerRef.current) return;

    const containerHeight = containerRef.current.clientHeight;
    const scrollTop = containerRef.current.scrollTop;
    const totalHeight = containerRef.current.scrollHeight;

    const currentPage = Math.floor(scrollTop / (containerHeight * 0.8));
    const visiblePages = [currentPage - 1, currentPage, currentPage + 1].filter(p => p >= 0);

    setRenderedPages(visiblePages);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const currentScroll = containerRef.current.scrollTop;

      if (Math.abs(currentScroll - lastScrollPosition) > 100) {
        setLastScrollPosition(currentScroll);
        updateVisiblePages();
      }
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [lastScrollPosition, updateVisiblePages]);

  const totalPages = useMemo(() => {
    if (!currentArticle?.content) return 0;
    const paragraphs = currentArticle.content.split('\n').filter(p => p.trim().length > 0);
    return Math.ceil(paragraphs.length / PARAGRAPHS_PER_PAGE);
  }, [currentArticle?.content]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    playSound('PAGE_TURN');
    setPage(value);
    
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    document.documentElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    setRenderedPages([value - 1]); 
  };

  const contentPages = useMemo(() => {
    if (!currentArticle?.content || !isInitialized) {
      return {};
    }

    try {
      const paragraphs = currentArticle.content
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const pages: Record<number, string[]> = {};
      const pageIndex = page - 1;
      const start = pageIndex * PARAGRAPHS_PER_PAGE;
      const end = start + PARAGRAPHS_PER_PAGE;
      pages[pageIndex] = paragraphs.slice(start, end);

      return pages;
    } catch (error) {
      logger.error('Error preparing content pages', error as Error);
      return {};
    }
  }, [currentArticle?.content, isInitialized, page]);

  const paragraphElements = useMemo(() => {
    const elements: HTMLElement[] = [];
    paragraphRefs.current.forEach(element => {
      if (element) elements.push(element);
    });
    return elements;
  }, [contentPages]);

  const handleDictionaryLookup = async (word: string) => {
    setMobileDict(prev => ({ ...prev, open: true, word, isLoading: true, error: null }));

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Word not found' : 'Failed to fetch definition');
      }

      const data = await response.json();
      setMobileDict(prev => ({ 
        ...prev, 
        definition: data[0], 
        isLoading: false 
      }));

    } catch (error) {
      setMobileDict(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load definition',
        isLoading: false 
      }));
    }
  };

  const handleDictionaryOpen = useCallback(() => {
    setMobileDict(prev => ({
      ...prev,
      open: true,
      word: '',
      definition: null,
      error: null,
      isLoading: false
    }));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.scrollSnapType = 'none';
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleScroll = () => {
      if (!containerRef.current) return;
      const currentScroll = containerRef.current.scrollTop;
      setLastScrollPosition(currentScroll);
      updateVisiblePages();
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [lastScrollPosition, updateVisiblePages]);

  const handleTranslation = async (text: string) => {
    try {
      const encodedText = encodeURIComponent(text);
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|zh-TW`
      );

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data: TranslationResponse = await response.json();
      
      if (data.responseStatus === 200) {
        setTranslation(data.responseData.translatedText);
      } else {
        throw new Error(data.responseDetails || 'Translation failed');
      }
    } catch (error) {
      logger.error('Translation error:', error as Error);
      setError(error instanceof Error ? error.message : 'Failed to translate');
    }
  };

  const handleMarkAsComplete = async () => {
    try {
      playSound('LEVEL_UP');
      const progressUpdate = {
        articleId: currentArticle?.id,
        progress: 100,
        wordsRead: currentArticle?.wordCount || 0,
        lastPosition: window.scrollY,
        completed: true,
        lastRead: new Date(),
        timeSpent: currentArticle?.id ? readingProgress[currentArticle.id]?.timeSpent || 0 : 0,
        completionDate: new Date()
      };

      await updateProgress(progressUpdate);
      setShowCompletionAlert(true);
    } catch (err) {
      logger.error('Failed to mark article as complete', err as Error);
    }
  };

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && fullscreen) {
      toggleFullscreen();
    }
  }, [fullscreen, toggleFullscreen]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  useEffect(() => {
    if (!focusMode) return;

    const handleScroll = () => {
      requestAnimationFrame(() => {
        const viewportMiddle = window.innerHeight / 2;
        let closestParagraph = -1;
        let minDistance = Infinity;

        paragraphRefs.current.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          const elementMiddle = rect.top + rect.height / 2;
          const distance = Math.abs(viewportMiddle - elementMiddle);

          if (distance < minDistance) {
            minDistance = distance;
            closestParagraph = index;
          }
        });

        if (closestParagraph !== -1 && minDistance < 150) {
          setCenteredParagraphIndex(closestParagraph);
        }
      });
    };

    handleScroll();

    contentRef.current?.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      contentRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [focusMode]);

  const renderedParagraphs = useMemo(() => {
    if (!contentPages[page-1]) return null;

    return contentPages[page-1].map((paragraph, index) => {
      const globalIndex = (page - 1) * PARAGRAPHS_PER_PAGE + index;
      
      return (
        <Box
          key={globalIndex}
          data-index={globalIndex}
          ref={(el: HTMLDivElement | null) => {
                      if (el) {
                        paragraphRefs.current.set(globalIndex, el);
                      } else {
                        paragraphRefs.current.delete(globalIndex);
                      }
                    }}
          className="paragraph-container"
          sx={{
            mb: focusMode ? '6vh' : '2vh',
            px: { xs: 2, sm: 3, md: 4 },
            py: focusMode ? 4 : 2,
            transition: 'all 0.3s ease-in-out',
            borderRadius: focusMode ? 2 : 1,
            position: 'relative',
            '&:hover': {
              bgcolor: 'action.hover',
              transform: focusMode ? 'scale(1.01)' : 'none',
            },
          }}
        >
          <Typography
            paragraph
            sx={{
              fontSize: 'inherit',
              lineHeight: 'inherit',
              fontFamily: 'inherit',
              textAlign: 'justify',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              hyphens: 'auto',
              WebkitUserSelect: 'text',
              userSelect: 'text',
              touchAction: 'pan-y',
              opacity: focusMode ? 
                (globalIndex === centeredParagraphIndex ? 1 : 0.3) : 1,
              transition: 'opacity 0.3s ease-in-out',
              mb: 0,
            }}
            onClick={() => enableTTS && handleTextToSpeech(paragraph)}
          >
            {paragraph}
          </Typography>
        </Box>
      );
    });
  }, [contentPages, page, focusMode, centeredParagraphIndex, enableTTS]);

  const containerStyles = useMemo(() => ({
    px: { xs: 0.5, sm: 3, md: 4 },
    py: { xs: 1, sm: 2 },
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}`,
    fontFamily: `${fontFamily}, system-ui, serif`,
    height: '100%',
    width: '100%',
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollBehavior: 'smooth',
  }), [fontSize, lineHeight, fontFamily]);

  if (!currentArticle?.content || isContentLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography color="text.secondary">
            Loading article content...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!currentArticle) return null;

  const handleNotes = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const text = selection.toString().trim();
      if (text && text.split(/\s+/).length > 1 && isValidText(text)) {
        setSelectedText(sanitizeText(text));
        setNotesOpen(true);
      }
    }
  };

  return (
    <ErrorBoundary>
      {focusMode && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: theme => alpha(
              theme.palette.background.default,
              theme.palette.mode === 'dark' ? 0.92 : 0.85
            ),
            backdropFilter: 'blur(8px)',
            zIndex: theme => theme.zIndex.drawer,
          }}
        />
      )}

      <Container 
        ref={contentRef}
        maxWidth="md" 
        sx={{ 
          position: focusMode ? 'fixed' : 'relative',
          ...(focusMode && {
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            height: '100vh',
            width: '100%',
            maxWidth: { xs: '100% !important', sm: '95%', md: '900px !important' },
            margin: '0 auto',
            overflow: 'auto',
            scrollBehavior: 'smooth',
            zIndex: theme => theme.zIndex.drawer + 1,
            bgcolor: 'transparent',
          }),
          ...(!focusMode && {
            py: { xs: 2, sm: 3 },
            overflow: 'visible',
          }),
          WebkitOverflowScrolling: 'touch',
          transition: 'all 0.3s ease',
          '& .paragraph-container': {
            marginBottom: focusMode ? 6 : 2,
          }
        }}
      >
        <Box sx={{ 
          mb: { xs: 4, sm: 5 },
          mt: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 0 }
        }}>
          <Typography 
            variant="h3" 
            gutterBottom
            sx={{
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
              lineHeight: 1.2,
              fontWeight: 500,
              color: 'text.primary',
              letterSpacing: '-0.01em',
              wordBreak: 'break-word',
            }}
          >
            {currentArticle.title}
          </Typography>
          {currentArticle.subtitle && (
            <Typography 
              variant="subtitle1" 
              color="text.secondary" 
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                lineHeight: 1.4,
                mt: 2,
                fontWeight: 400
              }}
            >
              {currentArticle.subtitle}
            </Typography>
          )}

          {currentArticle.coverImage && (
            <Box
              sx={{
                mt: 3,
                borderRadius: { xs: 0, sm: 2 },
                height: { xs: 200, sm: 300, md: 400 },
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box
                component="img"
                src={currentArticle.coverImage}
                alt={currentArticle.title}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Box>
          )}
        </Box>

        <Paper3D elevation={5}>
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <Box 
              sx={{
                p: { xs: 1, sm: 4, md: 5 },
                minHeight: '80vh',
                borderRadius: { xs: 0, sm: 2 },
                position: 'relative',
                bgcolor: theme => alpha(
                  theme.palette.mode === 'dark' ? 
                    theme.palette.background.paper : 
                    theme.palette.background.paper,
                  theme.palette.mode === 'dark' ? 0.6 : 0.8
                ),
                backdropFilter: 'blur(8px)',
                ...(!focusMode && {
                  boxShadow: 'none',
                  border: theme => `1px solid ${
                    theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.common.white, 0.1)
                      : alpha(theme.palette.common.black, 0.1)
                  }`,
                }),
                '& ::selection': {
                  backgroundColor: theme => theme.palette.primary.light + '40',
                  color: theme => theme.palette.primary.dark
                },
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <LinearProgress 
                  variant="determinate" 
                  value={Number(readingProgress?.progress) || 0}
                  sx={{ 
                    mb: { xs: 4, sm: 5 }, 
                    height: 4,
                    borderRadius: 2,
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 2
                    }
                  }}
                />

                <Box 
                  ref={containerRef}
                  sx={containerStyles}
                >
                  <Box ref={contentRef}>
                    {renderedParagraphs}
                  </Box>
                </Box>
              </motion.div>
            </Box>
          </motion.div>
        </Paper3D>

        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          justifyContent: 'center',
          alignItems: 'center',
          py: { xs: 2, sm: 3 },
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'background.default',
          borderTop: 1,
          borderColor: 'divider',
          zIndex: 1
        }}>
          <Pagination
            page={page}
            count={totalPages}
            onChange={handlePageChange}
            color="primary"
            size={isMobile ? "small" : "medium"}
            showFirstButton
            showLastButton
            sx={{
              '.MuiPagination-ul': {
                gap: { xs: 0.5, sm: 1 }
              }
            }}
          />
          
          {page === totalPages && !readingProgress[currentArticle?.id]?.completed && (
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={<CheckCircleOutlineIcon />}
              onClick={handleMarkAsComplete}
              sx={{
                minWidth: 200,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                boxShadow: theme => `0 8px 16px -4px ${theme.palette.success.main}50`,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme => `0 12px 20px -4px ${theme.palette.success.main}50`,
                },
                transition: 'all 0.2s ease',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': {
                    transform: 'scale(1)',
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                  },
                  '100%': {
                    transform: 'scale(1)',
                  },
                },
              }}
            >
              Complete Article
            </Button>
          )}
        </Box>

        {isMobile ? (
          <MobileContextMenu onLookup={handleDictionaryLookup} />
        ) : null}

        <ReadingSettingsDialog 
          open={textSettingsOpen}
          onClose={() => setTextSettingsOpen(false)}
        />

        <ReadingAchievementPopup 
          open={Boolean(achievement)}
          onClose={() => setAchievement(null)}
          message={achievement || ''}
        />

        {isMobile ? (
          <MobileDictionaryLookup
            word={mobileDict.word}
            open={mobileDict.open || dictionaryOpen}
            onClose={() => {
              setMobileDict(prev => ({ ...prev, open: false }));
              setDictionaryOpen(false);
            }}
            onAddToFlashcards={async (word, definition) => {
            }}
            definition={mobileDict.definition}
            isLoading={mobileDict.isLoading}
            error={mobileDict.error}
            onLookup={handleDictionaryLookup}
            translation={translation ?? undefined}
            onTranslate={handleTranslation}
            metadata={metadata}
            categories={categories.reduce((acc, cat, idx) => {
              acc[cat] = idx;
              return acc;
            }, {} as Record<string, number>)}
            onCategoryUpdate={handleCategoryUpdate}
          />
        ) : (
          <DictionaryLookup
            word={selectedWord}
            anchorEl={dictAnchorEl}
            onClose={() => {
              setDictAnchorEl(null);
              setSelectedWord('');
            }}
            onAddToFlashcards={async (word, definition) => {
            }}
            translation={translation || undefined}
            onTranslate={handleTranslation}
            metadata={metadata}
            categories={metadata?.categories || {}}
            onCategoryUpdate={handleCategoryUpdate}
          />
        )}

        <NoteSystem
          articleId={currentArticle.id}
          selectedText={selectedText}
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
        />
        {isMobile && (
          <MobileContextMenu 
            onLookup={handleDictionaryLookup}
          />
        )}
        <Snackbar
          open={showCompletionAlert}
          autoHideDuration={4000}
          onClose={() => setShowCompletionAlert(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setShowCompletionAlert(false)}
            severity="success"
            sx={{ width: '100%' }}
          >
            Article completed! Progress saved.
          </Alert>
        </Snackbar>
      </Container>
    </ErrorBoundary>
  );
};

interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

interface TranslationResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  quotaFinished?: boolean;
  responseStatus: number;
  responseDetails?: string;
}