# Converted React Native App

## Overview
This is an Expo/React Native application converted to run on the web. It features a character creation system with Supabase backend integration.

## Project Structure
- `App.tsx` - Main application entry point
- `src/` - Source code directory
  - `api/` - API integrations
  - `components/` - Reusable UI components
  - `constants/` - App constants
  - `context/` & `contexts/` - React Context providers
  - `hooks/` - Custom React hooks
  - `lib/` - Library utilities
  - `navigation/` - Navigation configuration
  - `screens/` - Screen components
  - `services/` - Service layer
  - `styles/` - Style definitions
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions

## Tech Stack
- Expo SDK 54
- React Native 0.81.5
- React 19.1.0
- TypeScript
- NativeWind (TailwindCSS for React Native)
- Supabase (backend/auth)
- React Navigation

## Development
The app runs in web mode on port 5000 using Expo's Metro bundler.

### Commands
- `npm run dev` - Start development server (web)
- `npm run web` - Start web development
- `npm run start` - Start Expo development server

## Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_STRAVA_CLIENT_ID` - Strava integration client ID

## Notes
- The app uses metro bundler for web builds
- Cache-Control headers are set to prevent caching issues in development
