import React from 'react';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';
import { NotificationProvider } from './NotificationContext';
import { AudioProvider } from './AudioContext';
import { ActivePetProvider } from './ActivePetContext';
import { TransitionProvider } from '../context/TransitionContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  return (
    <ThemeProvider>
      <TransitionProvider>
        <AudioProvider>
        <AuthProvider>
          <ActivePetProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </ActivePetProvider>
        </AuthProvider>
      </AudioProvider>
    </TransitionProvider>
  </ThemeProvider>
  );
}