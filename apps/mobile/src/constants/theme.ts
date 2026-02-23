import React from 'react';
// Converted React Native constants file
import { Dimensions, Platform, StatusBar } from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';

// Device Information
const { width, height } = Dimensions.get('window');

// Platform-specific header height
const headerHeight = Platform.OS === 'ios' ? 44 : 56;

// Colors
const primaryColor = '#00ffff'; // Cyberpunk Cyan
const secondaryColor = '#ff0000'; // Cyberpunk Red
const backgroundColor = '#0f172a'; // Deep slate (Cyberpunk dark)
const textColor = '#ffffff';
const lightGray = 'rgba(255, 255, 255, 0.1)';
const darkGray = 'rgba(15, 23, 42, 0.8)';

export const COLORS = {
  cyan: '#00ffff',
  red: '#ff0000',
  dark: '#0f172a',
  slate: '#1e293b',
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  gray: '#64748b',
  yellow: '#fbbf24',
};

// Fonts
const regularFont = 'System'; // Default system font
const boldFont = 'System'; // Default system font - can be styled as bold

// Spacing
const smallSpacing = 8;
const mediumSpacing = 16;
const largeSpacing = 24;

// Border Radius
const smallBorderRadius = 4;
const mediumBorderRadius = 8;
const largeBorderRadius = 12;

// Shadow
const shadow = {
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5, // For Android
};

// API Base URL (Example - replace with your actual API URL)
const API_BASE_URL = 'https://your-api-base-url.com';

// App Name
const APP_NAME = 'YourAppName';

// Version
const APP_VERSION = '1.0.0';

// Build Number (Android only - iOS uses version)
const APP_BUILD = '1';

// Status Bar Height
const STATUS_BAR_HEIGHT = getStatusBarHeight();

export const theme = {
  // Device Information
  screenWidth: width,
  screenHeight: height,

  // Platform Information
  platform: Platform.OS,
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',

  // Colors
  primaryColor: primaryColor,
  secondaryColor: secondaryColor,
  backgroundColor: backgroundColor,
  textColor: textColor,
  lightGray: lightGray,
  darkGray: darkGray,
  colors: COLORS,

  // Fonts
  regularFont: regularFont,
  boldFont: boldFont,

  // Spacing
  smallSpacing: smallSpacing,
  mediumSpacing: mediumSpacing,
  largeSpacing: largeSpacing,

  // Border Radius
  smallBorderRadius: smallBorderRadius,
  mediumBorderRadius: mediumBorderRadius,
  largeBorderRadius: largeBorderRadius,

  // Shadow
  shadow: shadow,

  // API
  API_BASE_URL: API_BASE_URL,

  // App Info
  APP_NAME: APP_NAME,
  APP_VERSION: APP_VERSION,
  APP_BUILD: APP_BUILD,

  // Header Height
  headerHeight: headerHeight,

  // Status Bar Height
  statusBarHeight: STATUS_BAR_HEIGHT,
};

export const CONSTANTS = {
  ...theme, // Include the theme object in CONSTANTS
  // Add any other constants here that are not theme-related
  DEFAULT_TIMEOUT: 15000, // Example: Default timeout for API requests
};