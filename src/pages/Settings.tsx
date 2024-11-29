import { UserPreferences } from '../types';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Divider,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormHelperText,
  CircularProgress,
  Badge,
  Avatar,
  Grid,
  LinearProgress,
  FormGroup,
  Checkbox,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useThemeMode, ThemeMode } from '../context/ThemeModeContext';
import { useI18n } from '../i18n/I18nContext';
import { useGamification } from '../context/GamificationContext';
import { CategoryProgress } from '../components/analytics/CategoryProgress';
import { getUserAnalytics } from '../services/analytics';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { UserAchievement } from '../types/gamification';
import { SelectChangeEvent } from '@mui/material/Select';
import { migrateCollectionIDs, verifyCollectionIDs } from '../utils/migrations';
import SyncIcon from '@mui/icons-material/Sync';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { exportUserData } from '../services/exportService';
import JSZip from 'jszip';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { alpha, useTheme } from '@mui/material/styles';

ChartJS.register(ArcElement, Tooltip, Legend);

const defaultPreferences: UserPreferences = {
  theme: 'system',
  notifications: true,
  audioEnabled: true,
  dailyGoal: 30,
  studySessionLength: 25,
  studyVocabLimit: 20,
  language: 'en',
  appMode: 'flashcards',
  readingSettings: {
    fontSize: 16,
    lineHeight: 1.5,
    fontFamily: 'Arial',
    enableTTS: false,
    autoScroll: false,
    highlightColor: '#ffeb3b',
    focusModeEnabled: false,
    theme: 'light'
  },
  pomodoroSettings: {
    workDuration: 25,
    breakDuration: 5,
    autoStartBreak: false
  },
  studySettings: {
    srsType: 'position',
    defaultNewCardsPerDay: 50,
    defaultReviewsPerDay: 100
  },
  preloadBatchSize: 5,
  cacheTimeout: 5
};

type Language = 'en' | 'zh-TW';

interface CategoryCount {
  [category: string]: number;
}

interface CollectionMetadata {
  categories: CategoryCount;
  count: number;
  lastUpdated?: Date;
}

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences, setPreferences } = useUserPreferences();
  const { mode, setMode } = useThemeMode();
  const { t, language, setLanguage } = useI18n();
  const { achievements } = useGamification();
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryStats, setCategoryStats] = useState<any>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);
  const [verification, setVerification] = useState<any>(null);

  interface VerificationState {
    flashcards: {
      actual: number;
      stored: number;
      missing: string[];
      metadata?: any;
    };
    articles: {
      actual: number;
      stored: number;
      missing: string[];
      metadata?: any;
    };
    isValid: boolean;
  }
  
  interface MigrationType {
    flashcards: boolean;
    articles: boolean;
  }
  
  const [migrationType, setMigrationType] = useState<MigrationType>({
    flashcards: true,
    articles: true,
  });

  const [exportType, setExportType] = useState<{
    flashcards: boolean;
    articles: boolean;
  }>({
    flashcards: true,
    articles: true,
  });
  const [exporting, setExporting] = useState(false);

  const [flashcardsMetadata, setFlashcardsMetadata] = useState<CollectionMetadata | null>(null);
  const [articlesMetadata, setArticlesMetadata] = useState<CollectionMetadata | null>(null);

  const handleExportData = async () => {
    if (!user || (!exportType.flashcards && !exportType.articles)) return;
    
    try {
      setExporting(true);
      const blob = await exportUserData(user.uid, exportType);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flashcard-app-export-${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      setNotification({
        type: 'success',
        message: t('settings.export.success')
      });
    } catch (error) {
      console.error('Export failed:', error);
      setNotification({
        type: 'error',
        message: t('settings.export.error')
      });
    } finally {
      setExporting(false);
    }
  };

  const SettingsCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme => theme.shadows[4],
          transform: 'translateY(-2px)',
        }
      }}
    >
      <Typography 
        variant="h6" 
        gutterBottom
        sx={{
          fontWeight: 600,
          mb: 3,
          color: 'primary.main'
        }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const prefsDoc = await getDoc(doc(db, 'users', user.uid, 'preferences', 'study'));
        if (prefsDoc.exists()) {
          setPreferences({
            ...defaultPreferences,
            ...prefsDoc.data() as UserPreferences 
          });
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, [user, setPreferences]);

  useEffect(() => {
    const loadMetadata = async () => {
      if (!user) return;
      try {
        const [flashcardsDoc, articlesDoc] = await Promise.all([
          getDoc(doc(db, 'users', user.uid, 'counters', 'flashcards')),
          getDoc(doc(db, 'users', user.uid, 'counters', 'articles'))
        ]);

        if (flashcardsDoc.exists()) {
          setFlashcardsMetadata({
            categories: flashcardsDoc.data().categories || {},
            count: flashcardsDoc.data().count || 0,
            lastUpdated: flashcardsDoc.data().lastUpdated?.toDate()
          });
        }

        if (articlesDoc.exists()) {
          setArticlesMetadata({
            categories: articlesDoc.data().categories || {},
            count: articlesDoc.data().count || 0,
            lastUpdated: articlesDoc.data().lastUpdated?.toDate()
          });
        }
      } catch (error) {
        console.error('Error loading metadata:', error);
      }
    };
    loadMetadata();
  }, [user]);

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  const handleSave = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'preferences', 'study'), preferences);
      setSaveStatus({type: 'success', message: 'Settings saved successfully'});
    } catch (error) {
      setSaveStatus({type: 'error', message: 'Failed to save settings'});
    }
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLang = event.target.value as Language;
    setLanguage(newLang);
    setSaveStatus({type: 'success', message: newLang === 'en' ? 'Language changed successfully' : '語言變更成功'});
  };

  const handleVerifyCollections = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const verification = await verifyCollectionIDs(user.uid, migrationType);
      setVerification(verification);
      setNotification({
        type: verification.isValid ? 'success' : 'warning',
        message: `Verification results - ${migrationType.flashcards ? `Flashcards: ${verification.flashcards.actual}, ` : ''}${migrationType.articles ? `Articles: ${verification.articles.actual}` : ''}`
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Verification failed: ' + (error as Error).message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrateCollections = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const verification = await verifyCollectionIDs(user.uid, migrationType);
      console.log('Current state:', verification);
  
      if (verification.isValid) {
        setNotification({
          type: 'info',
          message: 'Collections already in sync'
        });
        return;
      }
  
      const stats = [];
      if (migrationType.flashcards) {
        stats.push(`${verification.flashcards.actual} flashcards`);
      }
      if (migrationType.articles) {
        stats.push(`${verification.articles.actual} articles`);
      }
      
      setNotification({
        type: 'info',
        message: `Found ${stats.join(' and ')} to migrate`
      });
  
      const result = await migrateCollectionIDs(user.uid, migrationType);
      
      const finalVerification = await verifyCollectionIDs(user.uid, migrationType);
      
      if (finalVerification.isValid) {
        setNotification({
          type: 'success',
          message: `Migration completed successfully: ${result.flashcards} flashcards, ${result.articles} articles`
        });
        setVerification(finalVerification);
      } else {
        throw new Error('Migration verification failed');
      }
    } catch (err) {
      console.error('Migration failed:', err);
      setNotification({
        type: 'error', 
        message: 'Migration failed: ' + (err as Error).message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const CategoryChart = ({ data, title }: { data: CategoryCount; title: string }) => {
    const theme = useTheme();
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.info.main,
      theme.palette.warning.main,
    ];
  
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    const labels = Object.keys(data);
  
    const chartData = {
      labels,
      datasets: [{
        data: Object.values(data),
        backgroundColor: Object.keys(data).map((_, i) => alpha(colors[i % colors.length], 0.8)),
        borderColor: Object.keys(data).map((_, i) => colors[i % colors.length]),
        borderWidth: 1,
      }],
    };
  
    const options = {
      responsive: true,
      cutout: '75%',
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              const value = context.raw;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${context.label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      layout: {
        padding: 20
      }
    };
  
    return (
      <Box sx={{ 
        position: 'relative',
        height: 300,
        p: 2,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        gap: 2
      }}>
        <Box sx={{ 
          position: 'relative',
          width: { xs: '100%', sm: '60%' },
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Box sx={{ position: 'relative', width: '100%', maxWidth: 300, margin: 'auto' }}>
            <Doughnut data={chartData} options={options} />
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              width: '80%',
              pointerEvents: 'none'
            }}>
              <Typography 
                variant="h6" 
                color="primary"
                sx={{ 
                  fontWeight: 600,
                  fontSize: '2vw',
                  lineHeight: 1.2,
                }}
              >
                {title === t('settings.collections.flashcards.categoryProgress') ? t('settings.collections.flashcards.title') : t('settings.collections.articles.title')}
              </Typography>
            </Box>
          </Box>
        </Box>
  
        <Box sx={{ 
          width: { xs: '100%', sm: '40%' },
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxHeight: { xs: 100, sm: 280 },
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme.palette.divider,
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.primary.main,
            borderRadius: '4px',
          },
        }}>
          {Object.entries(data).map(([category, count], index) => (
            <Box 
              key={category}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '0.75rem',
                color: theme.palette.text.secondary,
                p: 0.5,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                }
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: alpha(colors[index % colors.length], 0.8),
                  flexShrink: 0
                }}
              />
              <Typography variant="caption" sx={{ flex: 1 }}>
                {category}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {count} ({((count / total) * 100).toFixed(1)}%)
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{
      minHeight: '100vh',
      py: { xs: 2, sm: 4 },
      px: { xs: 1, sm: 3 }
    }}>
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: { xs: 2, sm: 3 }
        }}>
          <Typography variant="h4" sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}>
            {t('settings.title')}
          </Typography>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!user || !preferences}
            sx={{
              display: { xs: 'none', sm: 'flex' }
            }}
          >
            {t('common.save')}
          </Button>
        </Box>

        {saveStatus && (
          <Alert severity={saveStatus.type} 
            sx={{ 
              borderRadius: 2,
              mb: { xs: 1, sm: 2 } 
            }}
          >
            {saveStatus.message}
          </Alert>
        )}

        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12} md={6}>
            <SettingsCard title={t('settings.preferences.title')}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 2,
                alignItems: 'flex-start'
              }}>
                <FormControl size="small">
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    mb: 1 
                  }}>
                    <Typography variant="body2" color="textSecondary">
                      {t('settings.language')}
                    </Typography>
                  </Box>
                  <Select
                    value={language}
                    onChange={handleLanguageChange}
                    sx={{ minWidth: 120 }}
                    size="small"
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="zh-TW">繁體中文</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    mb: 1 
                  }}>
                    <Typography variant="body2" color="textSecondary">
                      {t('settings.theme')}
                    </Typography>
                  </Box>
                  <Select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as ThemeMode)}
                    sx={{ minWidth: 120 }}
                    size="small"
                  >
                    <MenuItem value="light">{t('settings.themes.light')}</MenuItem>
                    <MenuItem value="dark">{t('settings.themes.dark')}</MenuItem>
                    <MenuItem value="system">{t('settings.themes.system')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </SettingsCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SettingsCard title={t('settings.study')}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 2
              }}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {t('settings.studyGoal')}
                  </Typography>
                  <TextField
                    type="number"
                    value={preferences.dailyGoal}
                    onChange={(e) => setPreferences((prev: UserPreferences) => ({
                      ...prev,
                      dailyGoal: parseInt(e.target.value)
                    }))}
                    inputProps={{ min: 5, max: 240 }}
                    size="small"
                    fullWidth
                  />
                </Box>

                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {t('settings.sessionLength')}
                  </Typography>
                  <TextField
                    type="number"
                    value={preferences.studySessionLength}
                    onChange={(e) => setPreferences((prev: UserPreferences) => ({
                      ...prev,
                      studySessionLength: parseInt(e.target.value)
                    }))}
                    inputProps={{ min: 5, max: 60 }}
                    size="small"
                    fullWidth
                  />
                </Box>

                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {t('settings.vocabLimit')}
                  </Typography>
                  <TextField
                    type="number"
                    value={preferences.studyVocabLimit}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      studyVocabLimit: Math.min(Math.max(parseInt(e.target.value), 5), 100)
                    }))}
                    inputProps={{ min: 5, max: 100 }}
                    size="small"
                    fullWidth
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                    {t('settings.vocabLimitHelp')}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {t('settings.srsType')}
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={preferences.studySettings?.srsType || 'interval'}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        studySettings: {
                          ...prev.studySettings,
                          srsType: e.target.value as 'interval' | 'position'
                        }
                      }))}
                    >
                      <MenuItem value="interval">{t('settings.srsTypes.interval')}</MenuItem>
                      <MenuItem value="position">{t('settings.srsTypes.position')}</MenuItem>
                    </Select>
                    <FormHelperText>
                      {t('settings.srsTypeHelp')}
                    </FormHelperText>
                  </FormControl>
                </Box>

                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1
                }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notifications}
                        onChange={(e) => setPreferences((prev: UserPreferences) => ({
                          ...prev,
                          notifications: e.target.checked
                        }))}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {t('settings.notifications')}
                      </Typography>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.audioEnabled}
                        onChange={(e) => setPreferences((prev: UserPreferences) => ({
                          ...prev,
                          audioEnabled: e.target.checked
                        }))}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {t('settings.audio')}
                      </Typography>
                    }
                  />
                </Box>
              </Box>
            </SettingsCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SettingsCard title={t('settings.performance')}>
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <TextField
                    label={t('settings.preloadLimit')}
                    type="number"
                    value={preferences.preloadBatchSize}
                    onChange={(e) => setPreferences((prev: UserPreferences) => ({
                      ...prev,
                      preloadBatchSize: Math.min(Math.max(parseInt(e.target.value), 3), 10)
                    }))}
                    inputProps={{ min: 3, max: 10 }}
                    helperText={t('settings.preloadLimitHelp')}
                    size="medium"
                  />
                </FormControl>

                <FormControl fullWidth>
                  <TextField
                    label={t('settings.cacheTimeout')}
                    type="number"
                    value={preferences.cacheTimeout}
                    onChange={(e) => setPreferences((prev: UserPreferences) => ({
                      ...prev,
                      cacheTimeout: Math.min(Math.max(parseInt(e.target.value), 1), 30)
                    }))}
                    inputProps={{ min: 1, max: 30 }}
                    helperText={t('settings.cacheTimeoutHelp')}
                    size="medium"
                  />
                </FormControl>
              </Stack>
            </SettingsCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SettingsCard title={t('settings.collections.title')}>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {t('settings.collections.selectCollections')}
                </Typography>
                <FormGroup row sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={migrationType.flashcards}
                        onChange={(e) => setMigrationType(prev => ({
                          ...prev,
                          flashcards: e.target.checked
                        }))}
                      />
                    }
                    label="Flashcards"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={migrationType.articles}
                        onChange={(e) => setMigrationType(prev => ({
                          ...prev,
                          articles: e.target.checked
                        }))}
                      />
                    }
                    label="Articles"
                  />
                </FormGroup>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {t('settings.collections.migration.verification')}
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={handleVerifyCollections}
                        disabled={isLoading || (!migrationType.flashcards && !migrationType.articles)}
                        startIcon={<AssessmentIcon />}
                        fullWidth
                      >
                        {t('settings.collections.migration.verify')}
                      </Button>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {t('settings.collections.migration.migration')}
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleMigrateCollections}
                        disabled={isLoading || (!migrationType.flashcards && !migrationType.articles)}
                        startIcon={<SyncIcon />}
                        fullWidth
                      >
                        {t('settings.collections.migration.migrate')}
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>

                {isLoading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress />
                    <Typography align="center" sx={{ mt: 1 }}>
                      {t('settings.collections.migration.inProgress')}
                    </Typography>
                  </Box>
                )}

                {notification && (
                  <Alert 
                    severity={notification.type} 
                    sx={{ mt: 2 }}
                    onClose={() => setNotification(null)}
                  >
                    {notification.message}
                  </Alert>
                )}

                {verification && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {t('settings.collections.verificationResults')}
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            {t('settings.collections.flashcards.title')}
                          </Typography>
                          <Box sx={{ mt: 2 }}>
                            {verification?.flashcards && (
                              <>
                                <Typography>
                                  Total Cards: {verification.flashcards.actual}
                                </Typography>
                                <Typography>
                                  Mastered: {verification.flashcards.metadata?.totalMastered || 0}
                                </Typography>
                                <Typography>
                                  Due for Review: {verification.flashcards.metadata?.reviewsDue || 0}
                                </Typography>
                                <Typography>
                                  Categories: {verification.flashcards.metadata?.categoriesCount || 0}
                                </Typography>
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Category Progress:
                                  </Typography>
                                  {verification.flashcards.metadata?.categoryList.map((cat: any) => (
                                    <Box key={cat.name} sx={{ mb: 1 }}>
                                      <Typography variant="caption">
                                        {cat.name}: {cat.masteredCount}/{cat.count}
                                      </Typography>
                                      <LinearProgress 
                                        variant="determinate"
                                        value={(cat.masteredCount / cat.count) * 100}
                                      />
                                    </Box>
                                  ))}
                                </Box>
                                <LinearProgress 
                                  variant="determinate"
                                  value={verification.flashcards.metadata?.averageAccuracy || 0}
                                  sx={{ mt: 1 }}
                                />
                                <Typography variant="caption">
                                  Average Accuracy: {Math.round(verification.flashcards.metadata?.averageAccuracy || 0)}%
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            {t('settings.collections.articles.title')}
                          </Typography>
                          <Box sx={{ mt: 2 }}>
                            {verification?.articles && (
                              <>
                                <Typography>
                                  Total Articles: {verification.articles.actual}
                                </Typography>
                                <Typography>
                                  Categories: {Object.keys(verification.articles.categories || {}).length}
                                </Typography>
                                <Typography>
                                  Last Updated: {verification.articles.lastUpdated?.toDate().toLocaleDateString()}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            </SettingsCard>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 2 
            }}>
              <Typography variant="h6" gutterBottom>
                {t('settings.collections.statistics')}
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ mt: 2 }}>
                      {flashcardsMetadata && Object.keys(flashcardsMetadata.categories).length > 0 ? (
                        <>
                          <CategoryChart 
                            data={flashcardsMetadata.categories} 
                            title={t('settings.collections.flashcards.categoryProgress')} 
                          />
                          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                            {t('settings.collections.flashcards.totalCards')}: {flashcardsMetadata.count}
                          </Typography>
                        </>
                      ) : (
                        <Typography color="text.secondary">
                          {t('settings.collections.flashcards.noData')}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ mt: 2 }}>
                      {articlesMetadata && Object.keys(articlesMetadata.categories).length > 0 ? (
                        <>
                          <CategoryChart 
                            data={articlesMetadata.categories} 
                            title={t('settings.collections.articles.categoryProgress')} 
                          />
                          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                            {t('settings.collections.articles.total')}: {articlesMetadata.count}
                          </Typography>
                        </>
                      ) : (
                        <Typography color="text.secondary">
                          {t('settings.collections.articles.noData')}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ 
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.default',
          py: 2,
          display: { xs: 'block', sm: 'none' }
        }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!user || !preferences}
            fullWidth
          >
            {t('common.save')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};