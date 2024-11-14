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
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

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
      breakDuration: 5
    }
  });
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

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

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Pomodoro Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth margin="normal">
              <TextField
                label="Work Duration (minutes)"
                type="number"
                value={preferences.pomodoroSettings.workDuration}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  pomodoroSettings: {
                    ...prev.pomodoroSettings,
                    workDuration: parseInt(e.target.value)
                  }
                }))}
                inputProps={{ min: 5, max: 60 }}
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
                    breakDuration: parseInt(e.target.value)
                  }
                }))}
                inputProps={{ min: 1, max: 30 }}
              />
            </FormControl>
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