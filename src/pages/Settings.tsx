import React, { useState, useEffect } from 'react';
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
  Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUserPreferences, UserPreferences } from '../context/UserPreferencesContext';
import { useThemeMode, ThemeMode } from '../context/ThemeModeContext';
import { useI18n } from '../i18n/I18nContext';
import { useGamification } from '../context/GamificationContext';
import { CategoryProgress } from '../components/analytics/CategoryProgress';
import { getUserAnalytics } from '../services/analytics';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { UserAchievement } from '../types/gamification';

const defaultPreferences: UserPreferences = {
  theme: 'system',
  dailyGoal: 30,
  studySessionLength: 25,
  studyVocabLimit: 20,  // Add default value
  notifications: true,
  audioEnabled: true,
  language: 'en',
  pomodoroSettings: {
    workDuration: 25,
    breakDuration: 5,
    autoStartBreak: false
  }
};

type Language = 'en' | 'zh-TW';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { preferences, setPreferences } = useUserPreferences();
  const { mode, setMode } = useThemeMode();
  const { t, language, setLanguage } = useI18n();
  const { achievements } = useGamification();
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryStats, setCategoryStats] = useState<any>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const prefsDoc = await getDoc(doc(db, 'users', user.uid, 'preferences', 'study'));
        if (prefsDoc.exists()) {
          setPreferences({
            ...defaultPreferences, // Spread default values first
            ...prefsDoc.data() as UserPreferences // Override with stored values
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
    const loadStats = async () => {
      if (!user) return;
      try {
        const analytics = await getUserAnalytics(user.uid);
        const transformedCategories = analytics?.categoryBreakdown.map(cat => ({
          name: cat.category,
          count: cat.count || 0,
          mastered: cat.mastered || 0,
          progress: cat.count ? Math.round((cat.mastered / cat.count) * 100) : 0
        })).filter(cat => cat.count > 0) || [];
        setCategoryStats(transformedCategories);
      } catch (error) {
        console.error('Error loading category stats:', error);
      }
    };
    loadStats();
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

  return (
    <Container maxWidth="md" sx={{
      minHeight: '100vh',
      py: { xs: 2, sm: 4 }
    }}>
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3 }
      }}>
        <Typography variant="h4" 
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem' },
            mb: { xs: 1, sm: 2 }
          }}
        >
          {t('settings.title')}
        </Typography>
        
        {saveStatus && (
          <Alert severity={saveStatus.type} sx={{ mb: 2 }}>
            {saveStatus.message}
          </Alert>
        )}

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('settings.appearance')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ 
              p: { xs: 2, sm: 3 },
              '& .MuiFormControl-root': {
                mb: { xs: 2, sm: 3 }
              },
              '& .MuiSwitch-root': {
                my: { xs: 1, sm: 2 }
              }
            }}>
              <FormControl fullWidth>
                <InputLabel>{t('settings.language')}</InputLabel>
                <Select
                  value={language}
                  label={t('settings.language')}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="zh-TW">繁體中文</MenuItem>
                </Select>
                <FormHelperText>
                  {t('settings.languageHelp')}
                </FormHelperText>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>{t('settings.theme')}</InputLabel>
                <Select
                  value={mode}
                  label={t('settings.theme')}
                  onChange={(e) => setMode(e.target.value as ThemeMode)}
                >
                  <MenuItem value="light">{t('settings.themes.light')}</MenuItem>
                  <MenuItem value="dark">{t('settings.themes.dark')}</MenuItem>
                  <MenuItem value="system">{t('settings.themes.system')}</MenuItem>
                </Select>
              </FormControl>
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('settings.study')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ 
              p: { xs: 2, sm: 3 },
              '& .MuiFormControl-root': {
                mb: { xs: 2, sm: 3 }
              },
              '& .MuiSwitch-root': {
                my: { xs: 1, sm: 2 }
              }
            }}>
              <Typography variant="h6" gutterBottom>App Preferences</Typography>
              
              <FormControl fullWidth margin="normal">
                <TextField
                  label={t('settings.studyGoal')}
                  type="number"
                  value={preferences.dailyGoal}
                  onChange={(e) => setPreferences((prev: UserPreferences) => ({
                    ...prev,
                    dailyGoal: parseInt(e.target.value)
                  }))}
                  inputProps={{ min: 5, max: 240 }}
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <TextField
                  label={t('settings.sessionLength')}
                  type="number"
                  value={preferences.studySessionLength}
                  onChange={(e) => setPreferences((prev: UserPreferences) => ({
                    ...prev,
                    studySessionLength: parseInt(e.target.value)
                  }))}
                  inputProps={{ min: 5, max: 60 }}
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <TextField
                  label={t('settings.vocabLimit')}
                  type="number"
                  value={preferences.studyVocabLimit}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    studyVocabLimit: Math.min(Math.max(parseInt(e.target.value), 5), 100)
                  }))}
                  inputProps={{ min: 5, max: 100 }}
                  helperText={t('settings.vocabLimitHelp')}
                />
              </FormControl>

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.notifications}
                      onChange={(e) => setPreferences((prev: UserPreferences) => ({
                        ...prev,
                        notifications: e.target.checked
                      }))}
                    />
                  }
                  label={t('settings.notifications')}
                />
              </Box>

              <Box sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.audioEnabled}
                      onChange={(e) => setPreferences((prev: UserPreferences) => ({
                        ...prev,
                        audioEnabled: e.target.checked
                      }))}
                    />
                  }
                  label={t('settings.audio')}
                />
              </Box>
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('settings.pomodoro')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              <FormControl fullWidth margin="normal">
                <TextField
                  label={t('settings.workDuration')}
                  type="number"
                  value={preferences.pomodoroSettings.workDuration}
                  onChange={(e) => setPreferences((prev: UserPreferences) => ({
                    ...prev,
                    pomodoroSettings: {
                      ...prev.pomodoroSettings,
                      workDuration: Math.min(Math.max(Number(e.target.value), 5), 60)
                    }
                  }))}
                  inputProps={{ min: 5, max: 60 }}
                  helperText="Time range: 5-60 minutes"
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <TextField
                  label={t('settings.breakDuration')}
                  type="number"
                  value={preferences.pomodoroSettings.breakDuration}
                  onChange={(e) => setPreferences((prev: UserPreferences) => ({
                    ...prev,
                    pomodoroSettings: {
                      ...prev.pomodoroSettings,
                      breakDuration: Math.min(Math.max(Number(e.target.value), 1), 30)
                    }
                  }))}
                  inputProps={{ min: 1, max: 30 }}
                  helperText="Time range: 1-30 minutes"
                />
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.pomodoroSettings.autoStartBreak}
                    onChange={(e) => setPreferences((prev: UserPreferences) => ({
                      ...prev,
                      pomodoroSettings: {
                        ...prev.pomodoroSettings,
                        autoStartBreak: e.target.checked
                      }
                    }))}
                  />
                }
                label={t('settings.autoStartBreak')}
              />
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!user || !preferences}
          >
            {t('common.save')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};