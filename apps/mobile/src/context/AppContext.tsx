// Converted React Native context file
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface AppContextProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  // Add other global state variables and functions here
  // Example:
  user: any | null;
  setUser: (user: any | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  appData: any;
  setAppData: (data: any) => void;
}

const AppContext = createContext<AppContextProps>({
  theme: 'light',
  setTheme: () => {},
  isLoading: false,
  setIsLoading: () => {},
  user: null,
  setUser: () => {},
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  appData: null,
  setAppData: () => {},
});

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [appData, setAppData] = useState<any>(null);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('theme');
        if (storedTheme) {
          setTheme(storedTheme === 'dark' ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Failed to load theme from AsyncStorage', error);
        Alert.alert('Error', 'Failed to load theme.');
      }
    };

    loadTheme();
  }, []);

  const handleSetTheme = async (newTheme: 'light' | 'dark') => {
    try {
      setTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme to AsyncStorage', error);
      Alert.alert('Error', 'Failed to save theme.');
    }
  };

  // Example function to fetch data (replace with your actual API call)
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Use React Native's fetch or a library like axios
      const response = await fetch('https://rickandmortyapi.com/api/character'); // Replace with your API endpoint
      const data = await response.json();
      setAppData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: AppContextProps = {
    theme,
    setTheme: handleSetTheme,
    isLoading,
    setIsLoading,
    user,
    setUser,
    isLoggedIn,
    setIsLoggedIn,
    appData,
    setAppData,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);