# Hunter System - Strava + Supabase Setup Guide

## 🚀 Quick Setup

### 1. Configure Environment Variables

Edit your `.env.local` file with your actual credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Strava Configuration
STRAVA_CLIENT_ID=your_strava_client_id_here
STRAVA_CLIENT_SECRET=your_strava_client_secret_here

# Gemini AI Configuration (for screenshot analysis)
GEMINI_API_KEY=your_gemini_api_key_here

# NextAuth Configuration
NEXTAUTH_SECRET=your_random_secret_key_here
NEXTAUTH_URL=http://localhost:5000
```

### 2. Set Up Supabase Database

1. Go to your Supabase dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `database-schema.sql`
4. Run the SQL to create all tables and data

### 3. Configure Strava App

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new app or use existing one
3. Set the **Authorization Callback Domain** to: `8eb1efba-61c4-4661-8cb0-7025370b5dfd-00-21cmsqubekbye.riker.replit.dev`
4. Copy the Client ID and Client Secret to your `.env.local`

### 4. Test the Integration

1. Start your app: `npm run dev`
2. Visit `http://localhost:5000`
3. Click "Connect Strava Account" in the onboarding
4. Authorize the app with Strava
5. Your activities should sync automatically!

## 🔧 Troubleshooting

### Environment Variables Not Working?
- Make sure your Replit secrets are properly set in the Secrets tab
- Restart your Replit environment after adding secrets
- Check that the variable names match exactly

### Strava OAuth Issues?
- Verify your callback URL matches exactly
- Ensure your Strava app is approved for API access
- Check that Client ID and Secret are correct

### Database Connection Issues?
- Verify your Supabase URL and anon key
- Make sure Row Level Security is enabled on tables
- Check that all tables were created successfully

### Activities Not Syncing?
- Try clicking the refresh button (🔄) in the header
- Check browser console for error messages
- Verify your Strava token hasn't expired

## 📊 Database Schema

The app creates these tables:
- `users` - User accounts linked to Strava
- `activities` - Synced fitness activities
- `user_progress` - XP, coins, level tracking
- `gear_items` - Available equipment
- `user_inventory` - User's owned items
- `dungeons` - Available challenges
- `user_dungeons` - User's dungeon progress

## 🎮 Features

- ✅ Strava OAuth authentication
- ✅ Automatic activity syncing
- ✅ XP and coin rewards system
- ✅ Equipment and inventory system
- ✅ Dungeon challenges
- ✅ Level progression
- ✅ Real-time progress tracking

## 📸 Screenshot Upload Feature

While waiting for Strava API approval, users can upload screenshots of their activities:

### **How It Works:**
1. **Take a screenshot** of your Strava activity
2. **Upload the image** through the app
3. **AI analyzes** the screenshot using Gemini 2.5
4. **Automatically awards** XP and coins based on detected activity data
5. **Admins can review** submissions if needed

### **AI Analysis Extracts:**
- Activity type (Run, Ride, Walk, etc.)
- Distance in kilometers
- Duration in minutes
- Elevation gain
- Activity date

### **Setup Gemini AI:**
1. **Get API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Add to environment variables:**
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. **Deploy** and users can upload screenshots!

## 🚦 Next Steps

After setup, you can:
1. **Set yourself as admin** (see below)
2. Customize XP/coin reward calculations
3. Add more gear items and dungeons
4. Implement social features (leaderboards)
5. Add achievement systems
6. Create different dungeon types

## 👑 Admin Setup

To make yourself an admin (required for approving users):

1. **Connect to your app** with Strava
2. **Go to Supabase SQL Editor**
3. **Run this query** (replace YOUR_USER_ID with your actual user ID):

```sql
UPDATE users SET is_admin = true, status = 'approved' WHERE id = 'YOUR_USER_ID';
```

4. **Refresh your app** - you'll see an "Admin" tab
5. **Visit `/admin`** to approve other users

**Find your user ID:**
- Check browser network tab when loading the app
- Look for the `/api/user` request response
- Your user ID will be in the response

Enjoy your Hunter System! 🏃‍♂️⚔️

