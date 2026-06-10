/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let mockUser: { uid: string; email: string } | null = null;

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, signOut: jest.fn() }),
}));
jest.mock('../../context/GamificationContext', () => ({
  useGamification: () => ({ levelSystem: null }),
}));
jest.mock('../../context/FocusModeContext', () => ({
  useFocusMode: () => ({ focusMode: false, toggleFocusMode: jest.fn() }),
}));
jest.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));
jest.mock('../../i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
jest.mock('../PomodoroTimer', () => ({
  PomodoroTimer: () => <div>pomodoro</div>,
}));
jest.mock('../gamification/LevelProgress', () => ({
  LevelProgress: () => <div>level progress</div>,
}));

import { Layout } from '../Layout';

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Layout>
        <div>page content</div>
      </Layout>
    </MemoryRouter>
  );

describe('<Layout />', () => {
  it('renders signed-out visitors a bare canvas without the app chrome', () => {
    mockUser = null;
    renderLayout();

    expect(screen.getByText('page content')).toBeInTheDocument();
    expect(screen.queryByText('FlashCards AI')).not.toBeInTheDocument();
    expect(screen.queryByText('pomodoro')).not.toBeInTheDocument();
  });

  it('shows the nav bar and side panel for a signed-in user', () => {
    mockUser = { uid: 'user-1', email: 'user@example.com' };
    renderLayout();

    expect(screen.getByText('page content')).toBeInTheDocument();
    expect(screen.getByText('FlashCards AI')).toBeInTheDocument();
    expect(screen.getAllByText('pomodoro').length).toBeGreaterThan(0);
  });
});
