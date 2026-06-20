import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { UserPreferences } from '../types';

/**
 * The single owner of the `users/{uid}/preferences/study` document for the
 * authenticated app. It wraps `useUserPreferences` once so every screen reads
 * and writes preferences through one in-memory copy — previously `Settings.tsx`
 * kept its own `getDoc`/`setDoc` pair, so a theme toggled from the nav bar could
 * be silently reverted by a stale Save. The Pomodoro timer lives in its own
 * `PomodoroContext` (Phase 4); this context keeps only the theme convenience
 * accessors plus the shared preferences read/write path.
 */
interface SettingsContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  theme: 'light' | 'dark' | 'system';
  toggleTheme: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, loading, updatePreferences } = useUserPreferences();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Sync local theme state with stored user preferences.
  useEffect(() => {
    if (preferences) {
      setTheme(preferences.theme);
    }
  }, [preferences]);

  const toggleTheme = React.useCallback(() => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(nextTheme);
    updatePreferences({ theme: nextTheme }).catch(console.error);
  }, [theme, updatePreferences]);

  const value = React.useMemo(() => ({
    preferences,
    loading,
    updatePreferences,
    theme,
    toggleTheme,
  }), [preferences, loading, updatePreferences, theme, toggleTheme]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
