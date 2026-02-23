// Converted React Native constants file
import React from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Platform-specific header height
const headerHeight = Platform.OS === 'ios' ? 44 : 56;

// Status bar height (handle notch)
const statusBarHeight = getStatusBarHeight();

// Safe area height (total header area)
const safeAreaHeight = headerHeight + statusBarHeight;

export const gameConstants = {
  // App name
  appName: 'Awesome Game',

  // Game version
  gameVersion: '1.0.0',

  // API base URL (example using environment variable)
  // Ensure you have react-native-config set up correctly
  // API_BASE_URL: process.env.API_BASE_URL || 'https://default-api.example.com', // Example with default value

  // Screen dimensions
  screenWidth: width,
  screenHeight: height,

  // Header height (platform-aware)
  headerHeight: headerHeight,

  // Status bar height
  statusBarHeight: statusBarHeight,

  // Safe area height (header + status bar)
  safeAreaHeight: safeAreaHeight,

  // Colors
  primaryColor: '#007AFF',
  secondaryColor: '#FF3B30',
  backgroundColor: '#F2F2F7',
  textColor: '#000000',
  lightTextColor: '#FFFFFF',
  successColor: '#4CD964',
  errorColor: '#FF3B30',
  warningColor: '#FFCC00',

  // Fonts
  primaryFont: 'System', // Default system font
  secondaryFont: 'System',

  // Font sizes
  fontSizeSmall: 12,
  fontSizeMedium: 16,
  fontSizeLarge: 20,
  fontSizeExtraLarge: 24,

  // Spacing
  spacingSmall: 8,
  spacingMedium: 16,
  spacingLarge: 24,
  spacingExtraLarge: 32,

  // Border radius
  borderRadiusSmall: 4,
  borderRadiusMedium: 8,
  borderRadiusLarge: 12,

  // Game settings (example)
  defaultScore: 0,
  maxLives: 3,
  initialLevel: 1,

  // Animation durations (in milliseconds)
  animationDurationShort: 200,
  animationDurationMedium: 400,
  animationDurationLong: 800,

  // Platform-specific settings (example)
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',

  // Debug mode (example - can be controlled by build config)
  debugMode: __DEV__, // Use __DEV__ for development builds

  // Placeholder image URL (example)
  placeholderImageUrl: 'https://via.placeholder.com/150',

  // Error messages (example)
  errorMessageGeneric: 'An unexpected error occurred. Please try again later.',
  errorMessageNetwork: 'Network error. Please check your internet connection.',

  // AsyncStorage keys (example)
  highScoreKey: 'highScore',
  gameSettingsKey: 'gameSettings',

  // Add more constants as needed for your game
};

export const RANK_COLORS: Record<string, string> = {
  'E': '#9ca3af', // gray-400
  'D': '#60a5fa', // blue-400
  'C': '#34d399', // emerald-400
  'B': '#a78bfa', // violet-400
  'A': '#facc15', // yellow-400
  'S': '#ef4444', // red-500
};

export const RARITY_COLORS: Record<string, string> = {
  'COMMON': '#9ca3af',       // Gray
  'UNCOMMON': '#4ade80',     // Green
  'RARE': '#60a5fa',         // Blue
  'EPIC': '#c084fc',         // Purple
  'LEGENDARY': '#facc15',    // Gold
  'MONARCH': '#ef4444',      // Red
  // Fallbacks or alternates just in case
  'MYTHIC': '#ef4444',
};