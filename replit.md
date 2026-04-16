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
- **Encounter system**: Weight-based random encounters via `spawn_weight` on each tile enter (no probability gate — every tile step picks a weighted-random encounter from the pool). Selection algorithm: sum weights → random in [0,total) → cumulative walk. Jeffrey is now a normal pool entry.
- **Genshin-style boot/cache architecture**: Three-phase system — Phase 1 (bootloader splash with Zustand state machine), Phase 2 (local asset caching via `assetManager.ts` with dual-hash filenames), Phase 3 (instant encounter transitions from persisted Zustand store). Boot gate in `App.tsx` blocks NavigationContainer until `bootStep === 'READY'`.
- **Dynamic asset manifest with incremental updates**: `assetManifest.ts` provides `fetchManifestVersion()` which calls the `get_asset_manifest_version` Supabase RPC — a single lightweight server-side MD5 hash of all asset-related columns. `syncEngine.ts` compares this against cached version in AsyncStorage; if unchanged, the full manifest query (7-table Supabase fetch) is skipped entirely. When version changes: `buildAssetManifest()` fetches all URLs, `computeManifestFingerprint()` (FNV-1a + DJB2 of sorted param-stripped URLs) identifies changes, `diffManifests()` downloads only new URLs. Cache (version + fingerprint + URLs) only persisted on zero download failures. Falls back to full manifest path if RPC unavailable. `assetManager.ts` exports shared `stripUrlParams()` for consistent URL identity.
- **Asset cache cleanup**: `assetManager.ts` includes `cleanupOrphanedAssets()` which scans `game_assets/` after manifest download and deletes files not referenced by any current manifest URL (plus stale `.tmp` files). Throttled to run at most once per day via AsyncStorage timestamp. Cache size is displayed in the Settings modal via `getCacheSizeBytes()` + `formatCacheSize()`.
- **SWR map loading**: `useMapData` hydrates from AsyncStorage cache immediately (no loading delay), then Supabase fetch runs in background to refresh stale data. Encounter pool fetched async (doesn't block map interactivity).
- **Vision flush on bootstrap**: `useExploration.refreshVision(force=true)` immediately commits discoveries/nodes/gridCenter to React state on initial load instead of deferring to blur/background.
- **Encounter pool persistence**: `useEncounterPoolStore` uses Zustand `persist` + AsyncStorage. `_hasHydrated` flag + `waitForHydration()` prevent race conditions. `useExploration` subscribes to hydration state to populate encounter pool ref before first tile step.
- **Pre-battle dialogue**: `encounter_pool.pre_battle_dialogue` JSONB column (enabled, scene.npc_name/sprite/bg, script[]) — when enabled, `DialogueScene` overlay plays before battle transition. Admin toggle + script editor in MobsTab.

## Deployment
Configured for autoscale deployment. Build: `cd apps/web && npm run build`. Run: `node_modules/.bin/next start -p 5000 -H 0.0.0.0`
