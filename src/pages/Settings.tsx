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
  Slider,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { usePronunciation } from '../context/PronunciationContext';
import { accentLabel } from '../utils/speech';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  studySessionLength: number;
  dailyGoal: number;
  notifications: boolean;
  audioEnabled: boolean;
  autoPlayAudio: boolean;
  language: 'en' | 'zh';
  pomodoroSettings: {
    workDuration: number;
    breakDuration: number;
    autoStartBreak: boolean;
  };
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      try {
        const prefsDoc = await getDoc(doc(db, 'users', user.uid, 'preferences', 'study'));
        if (prefsDoc.exists()) {
          setPreferences(prefsDoc.data() as UserPreferences);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, [user]);

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
      minHeight: '100dvh',
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
          Settings
        </Typography>
        
        {saveStatus && (
          <Alert severity={saveStatus.type} sx={{ mb: 2 }}>
            {saveStatus.message}
          </Alert>
        )}

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Study Settings</Typography>
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
                <InputLabel>Theme</InputLabel>
                <Select
                  value={preferences.theme}
                  label="Theme"
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    theme: e.target.value as 'light' | 'dark' | 'system'
                  }))}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System Default</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <TextField
                  label="Daily Study Goal (minutes)"
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
                  label="Study Session Length (minutes)"
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
                  label="Enable Notifications"
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
                  label="Enable Audio"
                />
              </Box>
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Pronunciation</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              {!speechSupported ? (
                <Alert severity="info">
                  Your browser doesn't support speech synthesis, so pronunciation
                  isn't available here. Try the latest Chrome, Edge, or Safari.
                </Alert>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Choose a voice and speed, then press preview to hear it. These
                    settings apply instantly across your flashcards.
                  </Typography>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Voice</InputLabel>
                    <Select
                      value={voices.some((v) => v.voiceURI === voiceURI) ? voiceURI : ''}
                      label="Voice"
                      onChange={(e) => updatePronunciation({ voiceURI: e.target.value })}
                    >
                      {voices.length === 0 && (
                        <MenuItem value="" disabled>
                          Loading voices…
                        </MenuItem>
                      )}
                      {voices.map((v) => (
                        <MenuItem key={v.voiceURI} value={v.voiceURI}>
                          {v.name} — {accentLabel(v.lang)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ mt: 3 }}>
                    <Typography gutterBottom>Speed: {rate.toFixed(1)}x</Typography>
                    <Slider
                      value={rate}
                      min={0.5}
                      max={1.5}
                      step={0.1}
                      marks={[
                        { value: 0.5, label: 'Slow' },
                        { value: 1, label: 'Normal' },
                        { value: 1.5, label: 'Fast' },
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
                      label="Pronounce each word automatically"
                    />
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<VolumeUpIcon />}
                      onClick={() => speak('pronunciation')}
                      disabled={speaking}
                    >
                      {speaking ? 'Playing…' : 'Preview voice'}
                    </Button>
                  </Stack>
                </>
              )}
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Pomodoro Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              <FormControl fullWidth margin="normal">
                <TextField
                  label="Work Duration (minutes)"
                  type="number"
                  value={preferences.pomodoroSettings.workDuration}
                  onChange={(e) => setPreferences(prev => ({
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
                  label="Break Duration (minutes)"
                  type="number"
                  value={preferences.pomodoroSettings.breakDuration}
                  onChange={(e) => setPreferences(prev => ({
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
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      pomodoroSettings: {
                        ...prev.pomodoroSettings,
                        autoStartBreak: e.target.checked
                      }
                    }))}
                  />
                }
                label="Auto-start breaks"
              />
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </Box>
      </Box>
    </Container>
  );
};