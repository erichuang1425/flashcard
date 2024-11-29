import { useState, useEffect } from 'react';
import type { UserPreferences } from './useUserPreferences';
import { useUserPreferences } from './useUserPreferences';

export const useUserSettings = () => {
  const { preferences, updatePreferences, loading, error } = useUserPreferences();
  const [isDirty, setIsDirty] = useState(false);

  const updateSetting = async <K extends keyof typeof preferences>(
    key: K, 
    value: typeof preferences[K]
  ) => {
    if (!preferences) return;
    
    try {
      await updatePreferences({ [key]: value });
      setIsDirty(true);
    } catch (err) {
      console.error('Failed to update setting:', err);
      throw err;
    }
  };

  const updatePomodoroSettings = async (settings: Partial<UserPreferences['pomodoroSettings']>) => {
    if (!preferences) return;
    
    try {
      const updatedSettings = {
        ...preferences.pomodoroSettings,
        ...settings
      };
      await updatePreferences({ pomodoroSettings: updatedSettings });
      setIsDirty(true);
    } catch (err) {
      console.error('Failed to update pomodoro settings:', err);
      throw err;
    }
  };

  const saveChanges = async () => {
    if (!isDirty || !preferences) return;
    
    try {
      await updatePreferences(preferences);
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
      throw err;
    }
  };

  return {
    settings: preferences,
    loading,
    error,
    updateSetting,
    saveChanges,
    isDirty,
    updatePomodoroSettings
  };
};
