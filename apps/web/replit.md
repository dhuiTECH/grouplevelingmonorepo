# Hunter System

## Overview

Hunter System is a gamified fitness tracking application built with Next.js. Users ("Hunters") track physical activities, earn experience points and coins, level up, equip cosmetic items, and participate in dungeon challenges. The app integrates with Strava for activity syncing and uses AI-powered screenshot analysis for manual activity verification.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS v4 with custom utility classes (system-glass effects, rank-based color theming)
- **Animations**: Framer Motion for UI transitions, tsparticles for background effects, Lottie for character animations
- **Component Pattern**: Client components with 'use client' directive for interactive elements, server components for data fetching

### Component Structure
- **Core Components** (`/components/`):
  - `LayeredAvatar.tsx` - Character avatar rendering with cosmetic layering
  - `StatusWindow.tsx` - Hunter stats and status display
  - `TrainingWidget.tsx` - Dashboard training log widget with 7-day grid
  - `TrainingLogModal.tsx` - Full training log modal with CRUD operations
  - `DungeonView.tsx` - Dungeon list and signup management
  - `ShopView.tsx` - Item shop interface
  - `InventoryView.tsx` - Hunter inventory management
  - `SocialHub.tsx` - Social features and associations
  - `Temple.tsx` - Class advancement system

### Custom Hooks (`/hooks/`)
- **`useHunterData.ts`** - Centralized data loading and state management hook
  - Manages: user, isLoading, activities, dungeons, leaderboard, shopItems, trainingProtocol, isAuthenticated, isOnboarded
  - Contains: checkAuthAndLoadData, loadLeaderboard, loadDungeons, loadShopItems, loadActivities, loadCosmetics, fetchProtocol
  - Pattern: Hook owns auth/data bootstrapping; page.tsx consumes via destructuring

### Backend Architecture
- **API Routes**: Next.js App Router API routes in `/app/api/`
- **Authentication**: Supabase Auth with OTP (magic link) flow, session managed via cookies
- **Admin System**: Separate admin authentication using Supabase Auth with password login, verified against `is_admin` field in profiles table
- **Server Actions**: Used for auth flows (`/app/actions/auth.ts`)

### Database
- **Provider**: Supabase (PostgreSQL)
- **Key Tables**:
  - `profiles` - Hunter data (hunter_name, email, exp, coins, level, hunter_rank, avatar, gender, status)
  - `dungeons` - Challenge events with scheduling and auto-start capabilities
  - `dungeon_registrations` - Hunter participation tracking
  - `shop_items` - Cosmetic items with positioning data (offset_x, offset_y, z_index, layer_order)
  - `user_cosmetics` - Hunter inventory and equipped items
- **Security**: Row Level Security (RLS) with public read, admin write policies
- **Client Pattern**: 
  - `supabase` - Client-side with anon key (respects RLS)
  - `supabaseAdmin` - Server-side with service role key (bypasses RLS)
  - `createServerClient` - SSR-compatible client for auth verification

### Authentication Flow
1. User enters email + hunter name on landing page
2. OTP sent via Supabase Auth
3. User verifies OTP, profile created/linked in `profiles` table
4. Session cookie set, hunter_id stored for subsequent requests
5. Admin users authenticate separately via password at `/admin/login`

### Activity Tracking
- **Strava Integration**: OAuth flow for activity syncing with token refresh
- **Screenshot Analysis**: Gemini AI (gemini-2.5-flash-lite) analyzes uploaded images to extract activity data
- **Manual Submission**: Users can upload workout screenshots for AI verification

### Cosmetic System
- Items have positioning metadata (offset_x, offset_y, z_index, scale)
- Sprite sheet animation support for animated equipment
- Layer-based rendering with slot-specific ordering
- Admin item positioner tool at `/admin/item-positioner`

## External Dependencies

### Third-Party Services
- **Supabase**: Database, authentication, file storage (buckets: Dungeons/dungeon-images)
- **Strava API**: Activity syncing via OAuth (`strava-v3` package)
- **Google Gemini AI**: Screenshot analysis for activity verification (`@google/generative-ai`)

### Required Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anonymous key (client-side)
SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (server-side admin operations)
STRAVA_CLIENT_ID - Strava OAuth app ID
STRAVA_CLIENT_SECRET - Strava OAuth secret
GEMINI_API_KEY - Google AI API key
NEXTAUTH_SECRET - Session encryption key
NEXTAUTH_URL - Application base URL
```

### Key NPM Packages
- `@supabase/supabase-js`, `@supabase/ssr` - Database and auth
- `next-auth` - Session management (configured but OTP flow uses Supabase directly)
- `@google/generative-ai` - AI screenshot analysis
- `strava-v3` - Strava API client
- `framer-motion` - Animations
- `@tsparticles/react` - Particle effects
- `@lottiefiles/dotlottie-react` - Lottie animations