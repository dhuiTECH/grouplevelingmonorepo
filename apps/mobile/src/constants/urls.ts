import React from 'react';
// Converted React Native constants file
import { Dimensions, Platform } from 'react-native';
import { getVersion, getBuildNumber } from 'react-native-device-info';
import Config from 'react-native-config';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Platform-specific constants
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

// App version and build number
const appVersion = getVersion();
const buildNumber = getBuildNumber();

// Colors
const primaryColor = '#007AFF';
const secondaryColor = '#FF3B30';
const backgroundColor = '#FFFFFF';
const textColor = '#000000';
const lightGray = '#D3D3D3';

// Fonts
const regularFont = 'System'; // Default system font
const boldFont = 'System'; // Default system font

// API URLs (using react-native-config for environment variables)
const API_BASE_URL = Config.API_BASE_URL || 'https://default-api-url.com'; // Provide a default value
const API_TIMEOUT = parseInt(Config.API_TIMEOUT || '10000', 10); // Default timeout of 10 seconds

// Other app-specific constants
const APP_NAME = 'YourAppName';
const DEFAULT_PAGE_SIZE = 20;

// Image assets (example)
const LOGO_URL = 'https://example.com/logo.png'; // Replace with your actual logo URL or require('path/to/local/image.png')

// Error messages
const NETWORK_ERROR_MESSAGE = 'Network error. Please check your internet connection.';
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred.';

// Export all constants
export const CONSTANTS = {
  SCREEN_WIDTH: width,
  SCREEN_HEIGHT: height,
  IS_IOS: isIOS,
  IS_ANDROID: isAndroid,
  APP_VERSION: appVersion,
  BUILD_NUMBER: buildNumber,
  PRIMARY_COLOR: primaryColor,
  SECONDARY_COLOR: secondaryColor,
  BACKGROUND_COLOR: backgroundColor,
  TEXT_COLOR: textColor,
  LIGHT_GRAY: lightGray,
  REGULAR_FONT: regularFont,
  BOLD_FONT: boldFont,
  API_BASE_URL: API_BASE_URL,
  API_TIMEOUT: API_TIMEOUT,
  APP_NAME: APP_NAME,
  DEFAULT_PAGE_SIZE: DEFAULT_PAGE_SIZE,
  LOGO_URL: LOGO_URL,
  NETWORK_ERROR_MESSAGE: NETWORK_ERROR_MESSAGE,
  DEFAULT_ERROR_MESSAGE: DEFAULT_ERROR_MESSAGE,
};

// Example usage of Config (install react-native-config and configure .env files)
// console.log("API Base URL:", CONSTANTS.API_BASE_URL);
// console.log("API Timeout:", CONSTANTS.API_TIMEOUT);