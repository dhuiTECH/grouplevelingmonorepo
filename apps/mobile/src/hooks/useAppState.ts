// Converted React Native hooks file
import React, { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export const useAppState = () => {
  const [appState, setAppState] = useState(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(true); // Track if app is active

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState === 'background' &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        setIsAppActive(true);
      } else {
        setIsAppActive(false);
      }

      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [appState]);

  return {
    appState,
    isAppActive,
  };
};