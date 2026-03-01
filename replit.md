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

## Mobile App Key Features (apps/mobile)
- **World map**: `SkiaWorldMap` (Skia canvas) + `SkiaTile` + `SkiaSpritesheet` for smooth sprite-sheet animation
- **Animation clock**: `useClock()` from React Native Skia (canvas-thread, no Reanimated drift)
- **Frozen smart tiles**: `SkiaTile` renders `isAutoTile:false` tiles that have `smartType+bitmask` via the same sprite-sheet path as live auto-tiles
- **Virtual joystick**: `VirtualJoystick.tsx` — 220px centered ring, PanResponder-driven, 8-direction angle snap (45° slices), inner walk zone (380ms/tile), outer sprint zone >65% magnitude (200ms/tile), knob snaps back on release, cyan→orange color transition at sprint threshold
- **Directional edge collision**: `EDGE_BLOCK_LAYER=-3`, `edgeBlocks` bitmask (N=1,E=2,S=4,W=8), two-sided check in `useExploration.ts`
- **Movement**: `useExploration.ts` → `move(dir)` — handles walkability, edge collision, Supabase sync

## Deployment
Configured for autoscale deployment. Build: `cd apps/web && npm run build`. Run: `node_modules/.bin/next start -p 5000 -H 0.0.0.0`
