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
  CircularProgress
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
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

export const ReadingInterface: React.FC = () => {
  const { currentArticle, readingProgress, updateProgress, isReading } = useReadingMode();
  const { preferences } = useUserPreferences();
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


  const {
    fontSize = 16,
    lineHeight = 1.6,
    fontFamily = 'system-ui',
    enableTTS = false,
  } = preferences?.readingSettings || {};


  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const paragraph = entry.target as HTMLElement;
        const index = parseInt(paragraph.dataset.index || '0');
        setActiveParagraph(index);
        
        const totalParagraphs = currentArticle?.content?.split('\n').length || 1;
        updateProgress({
          progress: (index / totalParagraphs) * 100,
          lastPosition: window.scrollY
        });

        if (index >= (currentPage + 1) * PARAGRAPHS_PER_PAGE - 10) {
          setCurrentPage(prev => prev + 1);
        }
      }
    });
  }, [currentArticle, currentPage, updateProgress]);

  useEffect(() => {
    if (!isReading || !contentRef.current) return;

    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.5 });

    const paragraphs = contentRef.current.querySelectorAll('[data-index]');
    paragraphs.forEach((p) => observer.observe(p));

    return () => observer.disconnect();
  }, [isReading, currentArticle, handleIntersection]);

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
    if (!text) return;

    // For single word lookup
    if (text.split(/\s+/).length === 1) {
      setSelectedWord(text);
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const fakeAnchor = document.createElement('div');
      fakeAnchor.style.position = 'absolute';
      fakeAnchor.style.left = `${rect.left}px`;
      fakeAnchor.style.top = `${rect.bottom}px`;
      document.body.appendChild(fakeAnchor);
      setDictAnchorEl(fakeAnchor);
      setTimeout(() => document.body.removeChild(fakeAnchor), 100);
    } else {
      // For longer text selections
      setSelectedText(text);
      setNotesOpen(true);
    }
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, []);

  useEffect(() => {
    if (!currentArticle?.content) return;
    let mounted = true;
    
    const loadPage = async (pageNum: number) => {
      // Prevent duplicate loading
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

    // Load current page and preload next page
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
      
      // Only update if scrolled more than 100px
      if (Math.abs(currentScroll - lastScrollPosition) > 100) {
        setLastScrollPosition(currentScroll);
        updateVisiblePages();
      }
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [lastScrollPosition, updateVisiblePages]);


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
      
      renderedPages.forEach(pageNum => {
        const start = pageNum * PARAGRAPHS_PER_PAGE;
        const end = start + PARAGRAPHS_PER_PAGE;
        pages[pageNum] = paragraphs.slice(start, end);
      });
      
      return pages;
    } catch (error) {
      logger.error('Error preparing content pages', error as Error);
      return {};
    }
  }, [currentArticle?.content, renderedPages, isInitialized]);


  const paragraphElements = useMemo(() => {
    const elements: HTMLElement[] = [];
    Object.values(contentPages).flat().forEach((_, index) => {
      const element = document.querySelector(`[data-index="${index}"]`);
      if (element) elements.push(element as HTMLElement);
    });
    return elements;
  }, [contentPages]);

  useEffect(() => {
    if (!isReading) return;

    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.5 });
    paragraphElements.forEach(p => observer.observe(p));
    return () => observer.disconnect();
  }, [isReading, handleIntersection, paragraphElements]);


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

  return (
    <ErrorBoundary>
      <Container 
        maxWidth="md" 
        sx={{ 
          py: { xs: 4, sm: 5, md: 6 },
          px: { xs: 2, sm: 3, md: 4 },
          maxWidth: '800px !important',
        }}
      >
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          <ReadingSpeedTracker />
        </Box>
        
        <Paper3D elevation={2}>
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <Box 
              sx={{
                p: { xs: 3, sm: 4, md: 5 },
                minHeight: '80vh',
                borderRadius: 2,
                position: 'relative',
                bgcolor: theme => theme.palette.mode === 'dark' ? 'background.paper' : '#fff',
                '& ::selection': {
                  backgroundColor: theme => theme.palette.primary.light + '40',
                  color: theme => theme.palette.primary.dark
                }
              }}
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Box sx={{ 
                  mb: { xs: 4, sm: 5 },
                  borderBottom: 1,
                  borderColor: 'divider',
                  pb: 3
                }}>
                  <Typography 
                    variant="h3" 
                    gutterBottom
                    sx={{
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                      lineHeight: 1.2,
                      fontWeight: 500,
                      color: 'text.primary',
                      letterSpacing: '-0.01em'
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
                </Box>

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
                  sx={{
                    height: '100%',
                    overflowY: 'auto',
                    scrollBehavior: 'smooth'
                  }}
                >
                  <Box ref={contentRef}>
                    {Object.entries(contentPages).map(([pageNum, paragraphs]) => (
                      <Box 
                        key={pageNum} 
                        data-page={pageNum}
                        sx={{
                          opacity: isContentLoading ? 0 : 1,
                          transition: 'opacity 0.3s ease'
                        }}
                      >
                        {paragraphs.map((paragraph, index) => {
                          const globalIndex = parseInt(pageNum) * PARAGRAPHS_PER_PAGE + index;
                          return (
                            <Typography
                              key={globalIndex}
                              paragraph
                              data-index={globalIndex}
                              sx={{
                                fontSize,
                                lineHeight,
                                fontFamily,
                                transition: 'all 0.3s ease',
                                backgroundColor: activeParagraph === globalIndex ? 
                                  'action.selected' : 'transparent',
                                p: 2,
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: 'action.hover'
                                }
                              }}
                              onClick={() => enableTTS && handleTextToSpeech(paragraph)}
                            >
                              {paragraph}
                            </Typography>
                          );
                        })}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </motion.div>
            </Box>
          </motion.div>
        </Paper3D>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Stack 
            direction="row" 
            spacing={2} 
            justifyContent="space-between"
            sx={{ mt: 3 }}
          >
            <IconButton sx={{ boxShadow: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <IconButton sx={{ boxShadow: 2 }}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>
        </motion.div>

        <ReadingAchievementPopup 
          open={Boolean(achievement)}
          onClose={() => setAchievement(null)}
          message={achievement || ''}
        />

        <DictionaryLookup
          word={selectedWord}
          anchorEl={dictAnchorEl}
          onClose={() => {
            setDictAnchorEl(null);
            setSelectedWord('');
          }}
          onAddToFlashcards={async (word, definition) => {
  
          }}
        />

        <NoteSystem
          articleId={currentArticle.id}
          selectedText={selectedText}
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
        />
      </Container>
    </ErrorBoundary>
  );
};