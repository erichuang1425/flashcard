import React, { useState, useEffect, useRef } from 'react';
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
  Slider,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useSettings } from '../context/SettingsContext';
import { usePronunciation } from '../context/PronunciationContext';
import { accentLabel } from '../utils/speech';
import { useLanguage } from '../i18n/LanguageContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useGuide } from '../context/GuideContext';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, Language } from '../i18n/translations';
import { UserPreferences } from '../types';

export const Settings: React.FC = () => {
  // Read and write preferences through the single SettingsContext owner so this
  // screen can't clobber a theme toggled elsewhere with a stale snapshot.
  const { preferences: storedPreferences, updatePreferences } = useSettings();
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    studySessionLength: 20,
    dailyGoal: 30,
    notifications: true,
    audioEnabled: true,
    autoPlayAudio: false,
    language: 'en',
    pomodoroSettings: {
      workDuration: 25,
      breakDuration: 5,
      autoStartBreak: false
    }
  });
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const { t, language, setLanguage } = useLanguage();
  const { restartOnboarding } = useOnboarding();
  const { tipsEnabled, setTipsEnabled, resetTips } = useGuide();

  const {
    supported: speechSupported,
    voices,
    voiceURI,
    rate,
    autoSpeak,
    speaking,
    speak,
    updateSettings: updatePronunciation,
  } = usePronunciation();

  // Keep the editable form in step with the shared preferences without ever
  // discarding unsaved edits. While the form is pristine (still matches the
  // values it was seeded with) it adopts the latest shared copy — so a later,
  // accurate read (a different signed-in user, or preferences that finished
  // loading after this page mounted) replaces a stale seed rather than being
  // locked out. Once the user edits, the draft is held until they Save.
  // `baseline` records the seeded values so Save can diff against them.
  const baseline = useRef<UserPreferences | null>(null);
  useEffect(() => {
    if (!storedPreferences) return;
    const dirty =
      baseline.current !== null &&
      JSON.stringify(preferences) !== JSON.stringify(baseline.current);
    if (!dirty) {
      setPreferences(storedPreferences);
      baseline.current = storedPreferences;
    }
    // Re-evaluate only when the shared preferences change; `preferences` is read
    // to detect an in-progress draft, not to drive the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedPreferences]);

  const handleSave = async () => {
    // Persist only the fields the user changed in this form, diffed against the
    // values it was seeded with. An untouched field is never written, so a save
    // here can't overwrite a newer value set elsewhere while the page was open
    // (e.g. the nav-bar theme toggle). `onboardingCompleted` is owned by
    // OnboardingProvider and never round-tripped.
    const base = baseline.current;
    const changed: Record<string, unknown> = {};
    (Object.keys(preferences) as (keyof UserPreferences)[]).forEach((key) => {
      if (key === 'onboardingCompleted') return;
      if (!base || JSON.stringify(preferences[key]) !== JSON.stringify(base[key])) {
        changed[key] = preferences[key];
      }
    });

    try {
      if (Object.keys(changed).length > 0) {
        await updatePreferences(changed as Partial<UserPreferences>);
        baseline.current = preferences;
      }
      setSaveStatus({type: 'success', message: t('settings.saved')});
    } catch (error) {
      setSaveStatus({type: 'error', message: t('settings.saveFail')});
    }
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <Container maxWidth="md" sx={{
      minHeight: '100%',
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
            <Typography variant="h6">{t('settings.studySettings')}</Typography>
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
              <Typography variant="h6" gutterBottom>{t('settings.appPreferences')}</Typography>

              <FormControl fullWidth margin="normal">
                <InputLabel>{t('settings.language')}</InputLabel>
                <Select
                  value={preferences.language}
                  label={t('settings.language')}
                  onChange={(e) => {
                    const next = e.target.value as Language;
                    setPreferences(prev => ({ ...prev, language: next }));
                    // Apply immediately so the whole UI updates without waiting
                    // for the Save button.
                    setLanguage(next);
                  }}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <MenuItem key={lang} value={lang}>{LANGUAGE_NAMES[lang]}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>{t('settings.theme')}</InputLabel>
                <Select
                  value={preferences.theme}
                  label={t('settings.theme')}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    theme: e.target.value as 'light' | 'dark' | 'system'
                  }))}
                >
                  <MenuItem value="light">{t('settings.themeLight')}</MenuItem>
                  <MenuItem value="dark">{t('settings.themeDark')}</MenuItem>
                  <MenuItem value="system">{t('settings.themeSystem')}</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <TextField
                  label={t('settings.dailyGoal')}
                  type="number"
                  value={preferences.dailyGoal}
                  onChange={(e) => setPreferences(prev => ({
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
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    studySessionLength: parseInt(e.target.value)
                  }))}
                  inputProps={{ min: 5, max: 60 }}
                />
              </FormControl>

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.notifications}
                      onChange={(e) => setPreferences(prev => ({
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
                      onChange={(e) => setPreferences(prev => ({
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

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('settings.guide')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('settings.guideDesc')}
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={tipsEnabled}
                    onChange={(e) => setTipsEnabled(e.target.checked)}
                  />
                }
                label={t('settings.tipsToggle')}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                {t('settings.tipsDesc')}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="outlined" onClick={resetTips}>
                  {t('settings.replayTips')}
                </Button>
                <Button variant="outlined" onClick={restartOnboarding}>
                  {t('settings.showGuide')}
                </Button>
              </Stack>
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{t('settings.pronunciation')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              {!speechSupported ? (
                <Alert severity="info">
                  {t('settings.speechUnsupported')}
                </Alert>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('settings.pronunciationHint')}
                  </Typography>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>{t('settings.voice')}</InputLabel>
                    <Select
                      value={voices.some((v) => v.voiceURI === voiceURI) ? voiceURI : ''}
                      label={t('settings.voice')}
                      onChange={(e) => updatePronunciation({ voiceURI: e.target.value })}
                    >
                      {voices.length === 0 && (
                        <MenuItem value="" disabled>
                          {t('settings.loadingVoices')}
                        </MenuItem>
                      )}
                      {voices.map((v) => (
                        <MenuItem key={v.voiceURI} value={v.voiceURI}>
                          {v.name} — {accentLabel(v.lang, t)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ mt: 3 }}>
                    <Typography gutterBottom>
                      {t('settings.speed', { rate: rate.toFixed(1) })}
                    </Typography>
                    <Slider
                      value={rate}
                      min={0.5}
                      max={1.5}
                      step={0.1}
                      marks={[
                        { value: 0.5, label: t('settings.speedSlow') },
                        { value: 1, label: t('settings.speedNormal') },
                        { value: 1.5, label: t('settings.speedFast') },
                      ]}
                      onChange={(_, value) =>
                        updatePronunciation({ rate: value as number })
                      }
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Box sx={{ mt: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoSpeak}
                          onChange={(e) =>
                            updatePronunciation({ autoSpeak: e.target.checked })
                          }
                        />
                      }
                      label={t('settings.autoPronounce')}
                    />
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<VolumeUpIcon />}
                      onClick={() => speak('pronunciation')}
                      disabled={speaking}
                    >
                      {speaking ? t('common.playing') : t('settings.previewVoice')}
                    </Button>
                  </Stack>
                </>
              )}
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
                  value={preferences.pomodoroSettings.workDuration ?? 25}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    pomodoroSettings: {
                      ...prev.pomodoroSettings,
                      workDuration: Math.min(Math.max(Number(e.target.value), 5), 60)
                    }
                  }))}
                  inputProps={{ min: 5, max: 60 }}
                  helperText={t('settings.workRange')}
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <TextField
                  label={t('settings.breakDuration')}
                  type="number"
                  value={preferences.pomodoroSettings.breakDuration ?? 5}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    pomodoroSettings: {
                      ...prev.pomodoroSettings,
                      breakDuration: Math.min(Math.max(Number(e.target.value), 1), 30)
                    }
                  }))}
                  inputProps={{ min: 1, max: 30 }}
                  helperText={t('settings.breakRange')}
                />
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.pomodoroSettings.autoStartBreak ?? false}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      pomodoroSettings: {
                        ...prev.pomodoroSettings,
                        autoStartBreak: e.target.checked
                      }
                    }))}
                  />
                }
                label={t('settings.autoStartBreaks')}
              />
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSave}
          >
            {t('settings.save')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};
