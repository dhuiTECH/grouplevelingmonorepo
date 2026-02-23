import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Try cookie-based auth first
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Parse formData to get file and potential fallback hunterId
  const formData = await request.formData()
  const file = formData.get('screenshot') as File
  const fallbackHunterId = formData.get('hunterId') as string | null

  // Determine user ID - prefer cookie auth, fallback to hunterId from request
  let userId: string | null = null
  
  if (user && !error) {
    userId = user.id
    console.log("Authenticated via cookie, User ID:", userId)
  } else if (fallbackHunterId) {
    // Verify the fallback hunter ID exists in the database
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', fallbackHunterId)
      .single()
    
    if (profile) {
      userId = fallbackHunterId
      console.log("Authenticated via fallback hunterId:", userId)
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {

    if (!file) {
      return NextResponse.json({ error: 'No screenshot provided' }, { status: 400 })
    }

    // Convert file to base64 for Gemini
    const bytes = await file.arrayBuffer()
    const base64Image = Buffer.from(bytes).toString('base64')

    // Analyze image with Gemini (latest cost-optimized model for vision)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    const prompt = `
Analyze this image and determine if it shows a physical activity (exercise, sports, fitness). Extract activity information in JSON format:

{
  "is_strava_screenshot": boolean (true if image contains clear Strava app/interface data),
  "activity_type": "Run", "Ride", "Walk", "Hike", "Swim", "Weightlifting", "Yoga", "Cycling", "Tennis", "Basketball", "Soccer", etc.,
  "confidence": number (0-100, how confident you are in the analysis),
  "distance_km": number (if visible, convert to kilometers),
  "duration_minutes": number (if visible, estimate or extract),
  "elevation_gain_m": number (if visible),
  "date": "YYYY-MM-DD" (if visible, otherwise use current date),
  "intensity_level": "low", "medium", "high" (estimate based on activity type and visible effort),
  "notes": "brief description of what you see in the image"
}

Rules:
- Accept ANY physical activity images (gym workouts, sports, running outdoors, swimming, etc.)
- Strava screenshots get bonus points for accurate data extraction
- For Strava screenshots, ensure the activity date matches today's date (YYYY-MM-DD)
- For non-Strava images, estimate reasonable values based on activity type
- Set confidence based on how clearly you can identify the activity
- Return valid JSON only

Image analysis:
`

    let result;
    try {
      result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64Image
        }
      }
    ])
    } catch (geminiError: any) {
      console.error('Gemini API Error:', geminiError)

      // Handle specific Gemini errors
      if (geminiError.status === 404) {
        return NextResponse.json({
          error: 'AI Model Not Found',
          details: 'The Gemini model is not available. Please try again later or contact support.'
        }, { status: 503 })
      }

      if (geminiError.status === 429) {
        return NextResponse.json({
          error: 'AI Rate Limit Exceeded',
          details: 'Too many requests to AI service. Please wait a moment and try again.'
        }, { status: 429 })
      }

      if (geminiError.message?.includes('quota') || geminiError.message?.includes('billing')) {
        return NextResponse.json({
          error: 'AI Quota Exceeded',
          details: 'AI service quota reached. Please try again later or upgrade your plan.'
        }, { status: 402 })
      }

      // Generic Gemini error
      return NextResponse.json({
        error: 'AI Processing Error',
        details: 'Failed to analyze image due to an issue with the AI service. This is not a problem with your image. Please try again later.'
      }, { status: 500 })
    }

    const response = await result.response
    const text = response.text()

    // Parse the JSON response
    let analysis
    try {
      // Extract JSON from the response (Gemini might add extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('No JSON found in Gemini response:', text)
        return NextResponse.json({
          error: 'AI Response Error',
          details: 'AI returned invalid response format. Please try again.'
        }, { status: 502 })
      }
      analysis = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text)
      console.error('Parse error:', parseError)
      return NextResponse.json({
        error: 'AI Analysis Error',
        details: 'Failed to process the AI response. Please try again later.'
      }, { status: 502 })
    }

    // Validate the analysis - different thresholds for Strava vs general activities
    const minConfidence = analysis.is_strava_screenshot ? 70 : 60; // Lower threshold for general activities

    if (!analysis.activity_type || analysis.confidence < minConfidence) {
      return NextResponse.json({
        error: 'Activity Not Recognized',
        details: analysis.is_strava_screenshot
          ? 'Please upload a clearer Strava screenshot with visible activity data.'
          : 'Please upload a clearer photo showing a physical activity.',
        analysis: analysis
      }, { status: 400 })
    }

    // Check if user has already uploaded any screenshot today (limit to 1 per day)
    const todayString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const { data: todayUploads } = await supabaseAdmin
      .from('activities')
      .select('id')
      .eq('hunter_id', userId)
      .eq('start_date', todayString)
      .ilike('name', '%Submission%'); // Look for manually submitted activities

    if (todayUploads && todayUploads.length >= 1) {
      return NextResponse.json({
        error: 'Daily Upload Limit Reached',
        details: 'You can only upload one activity screenshot per day. You\'ve already uploaded an activity today.',
        analysis: analysis
      }, { status: 429 })
    }

    // For Strava screenshots, validate that the activity date matches today
    if (analysis.is_strava_screenshot && analysis.date) {
      const activityDate = new Date(analysis.date);
      const activityDateString = activityDate.toISOString().split('T')[0];

      if (activityDateString !== todayString) {
        return NextResponse.json({
          error: 'Invalid Activity Date',
          details: `Strava activities must be from today (${todayString}). This activity appears to be from ${activityDateString}. Please upload a current activity.`,
          analysis: analysis
        }, { status: 400 })
      }
    }

    // Get user's profile data for luck stat, daily quest progress, and steps_banked
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('lck_stat, daily_completions, weekly_streak_count, last_submission_date, manual_daily_completions, manual_weekly_streak, steps_banked')
      .eq('id', userId)
      .single()

    const luckStat = userProfile?.lck_stat || 10;
    const luckCoinBonus = ((luckStat - 10) * 0.001); // 0.1% gold bonus per point above 10
    const luckDropBonus = ((luckStat - 10) * 0.0005); // 0.05% drop rate bonus per point above 10

    // Get user's equipped items and calculate coin boost bonus
    const { data: userCosmetics } = await supabaseAdmin
      .from('user_cosmetics')
      .select(`
        equipped,
        shop_items (
          bonuses
        )
      `)
      .eq('hunter_id', userId)
      .eq('equipped', true);

    let coinBoostPercent = 0;
    if (userCosmetics) {
      userCosmetics.forEach((cosmetic: any) => {
        if (cosmetic.shop_items?.bonuses && Array.isArray(cosmetic.shop_items.bonuses)) {
          cosmetic.shop_items.bonuses.forEach((bonus: any) => {
            if (bonus.type === 'coin_boost' && bonus.value) {
              coinBoostPercent += bonus.value;
            }
          });
        }
      });
    }

    // Add luck bonus to coin boost
    coinBoostPercent += luckCoinBonus;

    // Calculate XP and coins based on extracted data with all bonuses applied
    const xpEarned = calculateXP(analysis)
    const coinsEarned = calculateCoins(analysis, coinBoostPercent)

    // Create a unique numeric activity ID (using negative numbers for manual submissions)
    const activityId = -Math.abs(Date.now()) // Negative to avoid conflicts with Strava IDs

    // Store the manual activity
    const activityDate = analysis.date || new Date().toISOString().split('T')[0]; // Use current date if not provided

    const { data: activity, error: activityError } = await supabaseAdmin
      .from('activities')
      .insert({
        hunter_id: userId,
        strava_activity_id: activityId,
        name: `${analysis.activity_type} - ${analysis.is_strava_screenshot ? 'Strava' : 'Manual'} Submission`,
        type: analysis.activity_type,
        distance: analysis.distance_km || null,
        moving_time: analysis.duration_minutes ? analysis.duration_minutes * 60 : null, // Convert to seconds
        elapsed_time: analysis.duration_minutes ? analysis.duration_minutes * 60 : null, // Add missing required field
        total_elevation_gain: analysis.elevation_gain_m || null,
        start_date: activityDate,
        xp_earned: xpEarned,
        coins_earned: coinsEarned
      })
      .select()
      .single()

    if (activityError) {
      console.error('Activity creation error:', activityError)
      return NextResponse.json({ error: 'Failed to save activity' }, { status: 500 })
    }

    // Update user's manual daily quest progress
    const lastSubmission = userProfile?.last_submission_date;

    // Reset manual daily completions if it's a new day
    let currentManualDailyCompletions = userProfile?.manual_daily_completions || 0;
    if (lastSubmission !== todayString) {
      currentManualDailyCompletions = 0;
    }

    // Increment manual daily completions (max 1)
    const newManualDailyCompletions = Math.min(currentManualDailyCompletions + 1, 1);
    const wasFirstTimeToday = currentManualDailyCompletions < 1 && newManualDailyCompletions === 1;

    // Manual Weekly streak logic - increments with each daily submission, resets on Monday
    let newManualWeeklyStreak = userProfile?.manual_weekly_streak || 0;

    // Reset weekly streak every Monday (day 1 = Monday)
    const currentDay = new Date().getDay();
    if (currentDay === 1 && lastSubmission !== todayString) {
      newManualWeeklyStreak = 0; // Reset for new week
    }

    // Update manual weekly streak if completed daily quest for first time today
    if (wasFirstTimeToday) {
      newManualWeeklyStreak = Math.min(newManualWeeklyStreak + 1, 7);
    }

    // Grant 5000 steps for each manual submission (for world map movement)
    const currentStepsBanked = userProfile?.steps_banked ?? 0;
    const newStepsBanked = currentStepsBanked + 5000;

    // Update the user's profile with new quest progress and steps reward
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        manual_daily_completions: newManualDailyCompletions,
        manual_weekly_streak: newManualWeeklyStreak,
        last_submission_date: todayString,
        steps_banked: newStepsBanked
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      activity: activity,
      analysis: analysis,
      rewards: {
        xp_earned: xpEarned,
        coins_earned: coinsEarned,
        steps_earned: 5000
      },
      bonuses_applied: {
        coin_boost_percent: coinBoostPercent
      },
      quest_progress: {
        manual_daily_completions: newManualDailyCompletions,
        manual_weekly_streak: newManualWeeklyStreak,
        last_submission_date: todayString
      }
    })

  } catch (error) {
    console.error('Screenshot processing error:', error)
    return NextResponse.json({
      error: 'Processing failed',
      details: 'An error occurred while processing your screenshot'
    }, { status: 500 })
  }
}

// Calculate XP based on activity analysis
function calculateXP(analysis: any): number {
  let baseXP = 0;

  // Different calculation based on data availability
  if (analysis.distance_km && analysis.distance_km > 0) {
    baseXP = analysis.distance_km * 50; // 50 XP per km (reduced from 100)
  } else {
    // Base XP for activity type when distance unknown
    baseXP = getActivityBaseXP(analysis.activity_type, analysis.intensity_level);
  }

  const timeBonus = analysis.duration_minutes ? Math.floor(analysis.duration_minutes / 15) * 3 : 0; // 3 XP per 15 minutes (reduced from 5 per 10)
  const elevationBonus = (analysis.elevation_gain_m || 0) * 5; // 5 XP per meter elevation (reduced from 10)
  const activityTypeMultiplier = getActivityMultiplier(analysis.activity_type);

  // Strava bonus for accurate data, penalty for estimated data
  const stravaMultiplier = analysis.is_strava_screenshot ? 1.0 : 0.6; // 40% reduction for non-Strava

  return Math.floor((baseXP + timeBonus + elevationBonus) * activityTypeMultiplier * stravaMultiplier);
}

// Calculate coins based on activity analysis with coin boost bonus
function calculateCoins(analysis: any, coinBoostPercent: number = 0): number {
  let baseCoins = 0;

  if (analysis.distance_km && analysis.distance_km > 0) {
    baseCoins = Math.floor(analysis.distance_km * 5); // 5 coins per km (reduced from 10)
  } else {
    baseCoins = Math.floor(getActivityBaseXP(analysis.activity_type, analysis.intensity_level) / 40); // Scale down XP to coins more
  }

  const timeBonus = analysis.duration_minutes ? Math.floor(analysis.duration_minutes / 20) * 1 : 0; // 1 coin per 20 minutes (reduced from 2 per 15)

  // Strava multiplier - significant reduction for estimated data
  const stravaMultiplier = analysis.is_strava_screenshot ? 1.0 : 0.5; // 50% reduction for non-Strava

  let totalCoins = (baseCoins + timeBonus) * stravaMultiplier;

  // Apply coin boost bonus (coinBoostPercent is like 25 for 25%)
  if (coinBoostPercent > 0) {
    totalCoins = totalCoins * (1 + coinBoostPercent / 100);
  }

  return Math.floor(totalCoins);
}

// Activity type multipliers
function getActivityMultiplier(activityType: string): number {
  const multipliers: Record<string, number> = {
    'Run': 1.0,
    'Ride': 0.8,
    'Walk': 0.6,
    'Hike': 1.2,
    'Trail Run': 1.3,
    'Mountain Bike': 1.1,
    'Swim': 1.5,
    'Weightlifting': 1.4,
    'Yoga': 0.8,
    'Cycling': 0.9,
    'Tennis': 1.1,
    'Basketball': 1.2,
    'Soccer': 1.3,
    'Volleyball': 1.0,
    'Boxing': 1.6,
    'Martial Arts': 1.4,
    'Dancing': 0.9,
    'Pilates': 0.7,
    'Crossfit': 1.5,
    'Gym Workout': 1.1
  }
  return multipliers[activityType] || 1.0
}

// Base XP for activities without distance data
function getActivityBaseXP(activityType: string, intensityLevel: string = 'medium'): number {
  const baseXP: Record<string, number> = {
    'Run': 150,        // Reduced from 300
    'Ride': 125,       // Reduced from 250
    'Walk': 75,        // Reduced from 150
    'Hike': 200,       // Reduced from 400
    'Trail Run': 225,  // Reduced from 450
    'Mountain Bike': 175, // Reduced from 350
    'Swim': 250,       // Reduced from 500
    'Weightlifting': 200, // Reduced from 400
    'Yoga': 100,       // Reduced from 200
    'Cycling': 140,    // Reduced from 280
    'Tennis': 175,     // Reduced from 350
    'Basketball': 200, // Reduced from 400
    'Soccer': 225,     // Reduced from 450
    'Volleyball': 150, // Reduced from 300
    'Boxing': 275,     // Reduced from 550
    'Martial Arts': 225, // Reduced from 450
    'Dancing': 125,    // Reduced from 250
    'Pilates': 90,     // Reduced from 180
    'Crossfit': 250,   // Reduced from 500
    'Gym Workout': 160  // Reduced from 320
  }

  const xp = baseXP[activityType] || 100; // Default 100 XP (reduced from 200)

  // Intensity multiplier
  const intensityMultiplier = intensityLevel === 'high' ? 1.3 : intensityLevel === 'low' ? 0.7 : 1.0;

  return Math.floor(xp * intensityMultiplier);
}


