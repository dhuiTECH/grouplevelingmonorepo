import React from 'react';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';
import { NotificationProvider } from './NotificationContext';
import { AudioProvider } from './AudioContext';
import { ActivePetProvider } from './ActivePetContext';
import { TransitionProvider } from '../context/TransitionContext';
import { TileProvider } from './TileContext';

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
            <TileProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </TileProvider>
          </ActivePetProvider>
        </AuthProvider>
      </AudioProvider>
    </TransitionProvider>
  </ThemeProvider>
  );
}