// Converted React Native types file
// React Native TypeScript types
import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

// Define root stack params for navigation
export type RootStackParamList = {
  Home: undefined;
  Details: { itemId: string }; // Example: Passing an item ID to the Details screen
  Settings: undefined;
  // Add more screens and their parameters here
};

// Screen props for the Home screen
export type HomeScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Home'
>;

// Screen props for the Details screen
export type DetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Details'
>;

// Route props for the Details screen (alternative to using screen props directly)
export type DetailsRouteProps = RouteProp<RootStackParamList, 'Details'>;

// Screen props for the Settings screen
export type SettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Settings'
>;

// Example data type (replace with your actual data structure)
export interface Item {
  id: string;
  name: string;
  description: string;
  imageUrl?: string; // Optional image URL
  // Add more properties as needed
}

// API response type (example)
export interface ApiResponse<T> {
  data: T[];
  error?: string;
  isLoading: boolean; // Add loading state
}

// Type for configuration settings (example)
export interface AppSettings {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  // Add more settings as needed
}

// Type for user authentication state
export interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    // Add more user properties as needed
  };
  error?: string;
  isLoading: boolean; // Add loading state
}

// Type for form input values (example)
export interface LoginFormValues {
  username: string;
  password: string;
}

// Type for network status
export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}