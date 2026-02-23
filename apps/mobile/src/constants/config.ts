// Converted React Native constants file
import React from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import Config from 'react-native-config';

const { width, height } = Dimensions.get('window');

// Colors
const primaryColor = '#007AFF';
const secondaryColor = '#FF3B30';
const backgroundColor = '#F2F2F7';
const textColor = '#000000';
const lightGray = '#D1D1D6';
const darkGray = '#8E8E93';

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

// Screen Dimensions
const screenWidth = width;
const screenHeight = height;

// Platform Specific Constants
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

// Status Bar Height (for safe area considerations)
const statusBarHeight = getStatusBarHeight(true); // true for forced, false for not forced

// API Configuration (using react-native-config)
const API_BASE_URL = Config.API_BASE_URL || 'https://default-api-url.com'; // Provide a default value
const API_TIMEOUT = parseInt(Config.API_TIMEOUT || '10000', 10); // Default timeout of 10 seconds

// App-Specific Constants
const APP_NAME = 'MyReactNativeApp';
const APP_VERSION = '1.0.0';

// Example: AsyncStorage Keys
const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';

// Example: Default Values
const DEFAULT_AVATAR_URL = 'https://example.com/default-avatar.png';

// Example: Error Messages
const NETWORK_ERROR_MESSAGE = 'Network error. Please check your internet connection.';
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred.';

// Example: Animation Durations
const SHORT_ANIMATION_DURATION = 200;
const MEDIUM_ANIMATION_DURATION = 400;

// Exported Constants
export const CONSTANTS = {
  COLORS: {
    primary: primaryColor,
    secondary: secondaryColor,
    background: backgroundColor,
    text: textColor,
    lightGray: lightGray,
    darkGray: darkGray,
  },
  FONTS: {
    regular: regularFont,
    bold: boldFont,
  },
  SPACING: {
    small: smallSpacing,
    medium: mediumSpacing,
    large: largeSpacing,
  },
  BORDER_RADIUS: {
    small: smallBorderRadius,
    medium: mediumBorderRadius,
    large: largeBorderRadius,
  },
  SCREEN: {
    width: screenWidth,
    height: screenHeight,
  },
  PLATFORM: {
    isIOS: isIOS,
    isAndroid: isAndroid,
  },
  STATUS_BAR: {
    height: statusBarHeight,
  },
  API: {
    BASE_URL: API_BASE_URL,
    TIMEOUT: API_TIMEOUT,
  },
  APP: {
    NAME: APP_NAME,
    VERSION: APP_VERSION,
  },
  ASYNC_STORAGE_KEYS: {
    AUTH_TOKEN: AUTH_TOKEN_KEY,
    USER_DATA: USER_DATA_KEY,
  },
  DEFAULTS: {
    AVATAR_URL: DEFAULT_AVATAR_URL,
  },
  ERRORS: {
    NETWORK: NETWORK_ERROR_MESSAGE,
    DEFAULT: DEFAULT_ERROR_MESSAGE,
  },
  ANIMATION: {
    SHORT: SHORT_ANIMATION_DURATION,
    MEDIUM: MEDIUM_ANIMATION_DURATION,
  },
};