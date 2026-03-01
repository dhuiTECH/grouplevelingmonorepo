# Group Leveling - Web App

## Overview
A fitness RPG web application where users track their fitness journey as an RPG adventure. Built with Next.js 16, React 19, and Supabase.

## Project Structure
This is a pnpm monorepo (Turborepo):
- `apps/web` - Main Next.js web application (runs on port 5000)
- `apps/mobile` - React Native / Expo mobile app
- `packages/` - Shared packages (eslint-config, typescript-config, ui)

## Tech Stack
- **Framework**: Next.js 16 (Turbopack in dev)
- **Runtime**: Node.js 20
- **Package Manager**: pnpm (monorepo via pnpm-workspace.yaml + Turbo)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Database/Auth**: Supabase (PostgreSQL + Auth)
- **State Management**: Zustand
- **Animations**: Framer Motion, Lottie, Pixi.js
- **Auth**: NextAuth + Supabase Auth

## Environment Variables / Secrets Required
All configured as Replit secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_SECRET`
- `SESSION_SECRET`
- `NEXT_PUBLIC_STRAVA_CLIENT_ID`
- `GEMINI_API_KEY` (for food scanning feature)
- `STRAVA_CLIENT_SECRET`
- `NEXTAUTH_URL`

## Running the App
The workflow runs: `cd apps/web && node_modules/.bin/next dev -p 5000 -H 0.0.0.0`

## Key Configuration Notes
- `apps/web/next.config.js` - Configured with `allowedDevOrigins` for Replit proxy
- `apps/web/next.config.js` - `experimental.serverActions.allowedOrigins` for Replit domains
- Native binding fix: `@tailwindcss/oxide-linux-x64-gnu` must be installed for Linux (Tailwind CSS v4 uses Rust native binding)
- There's also a `package-lock.json` in `apps/web` alongside the root `pnpm-lock.yaml` - Next.js warns about this but it works fine

## Deployment
Configured for autoscale deployment. Build: `cd apps/web && npm run build`. Run: `node_modules/.bin/next start -p 5000 -H 0.0.0.0`
