import React, { createContext, useContext, useState } from 'react';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  audioEnabled: boolean;
  dailyGoal: number;
  studySessionLength: number;
  pomodoroSettings: {
    workDuration: number;
    breakDuration: number;
    autoStartBreak: boolean;
  };
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  notifications: true,
  audioEnabled: true,
  dailyGoal: 30,
  studySessionLength: 20,
  pomodoroSettings: {
    workDuration: 25,
    breakDuration: 5,
    autoStartBreak: false
  }
};

interface UserPreferencesContextType {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  return context;
};

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  return (
    <UserPreferencesContext.Provider value={{ preferences, setPreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};