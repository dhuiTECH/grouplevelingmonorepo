'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signInWithOTP(formData: FormData) {
  const email = formData.get('email') as string
  const characterName = formData.get('characterName') as string

  if (!email || !characterName) {
    return { error: 'Email and character name are required' }
  }

  try {
    const supabase = await createClient()

    // Store character name in session temporarily
    const cookieStore = await cookies()
    cookieStore.set('pending_character_name', characterName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300 // 5 minutes
    })

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/auth/callback`,
      }
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true, email }
  } catch (error: any) {
    console.error('OTP Send Error:', error)
    return { error: `Failed to send OTP: ${error.message || error}` }
  }
}

// Fixed stabilizeConnection using atomic upsert to prevent race conditions

export async function stabilizeConnection(formData: FormData) {
  const email = formData.get('email') as string
  const otp = formData.get('token') as string
  const hunterName = formData.get('characterName') as string
  const gender = formData.get('gender') as string
  const selectedAvatar = formData.get('avatar') as string
  const currentClass = formData.get('current_class') as string

  console.log('🔧 stabilizeConnection called with:', { email, otp: otp ? '***' + otp.slice(-2) : 'empty', hunterName, gender, currentClass });

  if (!email || !otp || !hunterName || !gender || !currentClass) {
    console.log('❌ Missing required fields');
    return { error: 'Email, OTP, character name, gender, and class are required' }
  }

  try {
    console.log('🔗 Creating Supabase client...');
    const supabase = await createClient()
    const cookieStore = await cookies()

    console.log('📧 Verifying OTP...');
    // 1. Verify the OTP Signature
    const { data, error: authError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })

    console.log('📡 OTP verification result:', { success: !authError, user: data?.user?.id });

    if (authError || !data.user) {
      console.log('❌ OTP verification failed:', authError);
      return { error: authError?.message || "Invalid verification code" }
    }

    console.log('👤 User authenticated, creating profile...');
    // 2. Atomic Profile Creation
    // Use 'user.id' directly from the successful verification response
    const user = data.user

    // Use selected avatar, fallback to gender-based default
    let avatar = selectedAvatar || '/NoobMan.png' // default
    if (!selectedAvatar) {
      if (gender === 'Female') {
        avatar = '/NoobWoman.png'
      } else if (gender === 'Non-binary') {
        avatar = '/Noobnonbinary.png'
      }
    }

    console.log('💾 Checking existing user status...');

    // Check if user already exists to preserve their status
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    const userStatus = existingProfile?.status || 'pending'; // Preserve existing status, default to pending for new users
    console.log('📊 User status:', { existing: existingProfile?.status, using: userStatus });

    console.log('💾 UPSERTING profile (Race-condition proof)...');

    // 3. THE FIX: Changed from .insert() to .upsert()
    // This handles the race condition where a Database Trigger might have already created the row.
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        hunter_name: hunterName,
        email: email,
        gender: gender,
        avatar: avatar,
        current_class: currentClass || 'None',
        rank_tier: 0,
        current_title: 'Novice Hunter',
        next_advancement_attempt: null,
        str_stat: 10,
        spd_stat: 10,
        end_stat: 10,
        int_stat: 10,
        lck_stat: 10,
        per_stat: 10,
        wil_stat: 10,
        current_hp: 100,
        max_hp: 100,
        current_mp: 50,
        max_mp: 50,
        unassigned_stat_points: 5,
        status: userStatus, // Preserve existing status instead of always 'pending'
        exp: 0,
        coins: 0,
        level: 1,
        hunter_rank: 'E',
        weekly_slots_used: 0,
        last_reset: new Date().toISOString(),
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single()

    if (dbError) {
      console.error("❌ SYNC_FAILED:", dbError.message, dbError.details)
      
      // Handle the case where a trigger might be failing due to missing items
      if (dbError.message.includes('foreign key constraint') || dbError.message.includes('saving new user')) {
        return { error: "Initialization failed: The system couldn't assign your starter gear. This usually happens if the item database is being updated. Please try again in a moment." }
      }

      // Check if it's a unique constraint violation on hunter_name or email
      if (dbError.code === '23505') {
        const field = dbError.message.includes('hunter_name') ? 'Hunter Name' : 'Email';
        return { error: `Duplicate profile detected: That ${field} is already taken.` }
      }
      return { error: "System sync failed: " + dbError.message }
    }

    console.log('✅ Profile synced successfully');
    // Clear temporary cookie
    cookieStore.delete('pending_character_name')

    return { success: true, profile }
  } catch (error: any) {
    console.error('Connection Stabilization Error:', error)
    return { error: `Failed to stabilize connection: ${error.message || error}` }
  }
}