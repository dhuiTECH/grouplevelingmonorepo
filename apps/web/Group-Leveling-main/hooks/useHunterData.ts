'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

const ACTIVE_DUNGEONS = [
  {
    id: 'd1',
    name: 'Sunday Track Raid',
    type: 'Weekly Meetup',
    difficulty: 'B-Rank',
    requirement: 'Group 5km',
    xpReward: 500,
    coinReward: 100,
    loot: 'Rare Box',
    status: 'open',
    boss: 'Interval Ogre',
    scheduled_start: '2026-01-11T12:00:00.000Z'
  },
  {
    id: 'd2',
    name: 'Summit of the Cursed Hill',
    type: 'Trail Meetup',
    difficulty: 'A-Rank',
    requirement: '300m Elevation',
    xpReward: 500,
    coinReward: 100,
    loot: 'Epic Box',
    status: 'upcoming',
    boss: 'Vertical Wraith'
  }
];

const DEFAULT_USER: User = {
  name: "Hunter",
  hunter_name: "Hunter",
  id: "default-user-id",
  exp: 0,
  skill_points: 0,
  coins: 0,
  gems: 0,
  level: 1,
  rank: 'E',
  slotsUsed: 0,
  inventory: [],
  cosmetics: [],
  equipped: { feet: null, wrist: null, body: null, weapon: null, back: null, aura: null, eyes: null, earrings: null, neck: null },
  submittedIds: [],
  completedDungeons: [],
  stravaConnected: false,
  current_class: 'None',
  rank_tier: 0,
  current_title: 'Novice Hunter',
  next_advancement_attempt: undefined,
  base_body_url: undefined,
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
    daily_completions: 0,
    daily_steps: 0,
    last_steps_reset_at: undefined,
    weekly_streak_count: 0,
  grand_chest_available: false,
  last_submission_date: undefined,
  referral_code: '',
  referral_used: '',
  active_skin: 'default'
};

const calculatePace = (movingTime: number, distance: number): string => {
  const paceSeconds = movingTime / distance;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const calculateXP = (activity: any): number => {
  const baseXP = activity.distance * 100;
  const elevationBonus = activity.total_elevation_gain * 10;
  return Math.floor(baseXP + elevationBonus);
};

const calculateCoins = (activity: any): number => {
  return Math.floor(activity.distance * 10);
};

export function useHunterData() {
  const { user: authUser } = useAuth();
  
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [dungeons, setDungeons] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [trainingProtocol, setTrainingProtocol] = useState<any[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [ownedItemIds, setOwnedItemIds] = useState<Set<string>>(new Set());
  const [leaderboardLastUpdated, setLeaderboardLastUpdated] = useState<Date | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      console.log('🔍 Loading leaderboard...');
      const response = await fetch('/api/leaderboard');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
      }

      const { leaderboard: transformedData } = await response.json();
      console.log('📊 Leaderboard API result:', { count: transformedData?.length });

      if (transformedData && transformedData.length > 0) {
        console.log('✅ Leaderboard data loaded:', transformedData.length, 'users');

        const sungJinWooEntry = {
          id: 'sung-jin-woo-special',
          xp: 999999,
          level: 120,
          rank: 'S',
          combatPower: 99999,
          prestigeScore: 1000000,
          users: {
            name: 'Sung Jin Woo',
            hunter_name: 'Sung Jin Woo',
            avatar_url: '/sungjinwoo.png',
            base_body_url: '/sungjinwoo-monarch.png',
            current_class: 'Shadow Monarch',
            rank_tier: 10,
            current_title: 'Shadow Monarch',
            next_advancement_attempt: null,
            str_stat: 120,
            spd_stat: 120,
            end_stat: 120,
            int_stat: 120,
            lck_stat: 120,
            per_stat: 120,
            wil_stat: 120,
            current_hp: 3000,
            max_hp: 3000,
            current_mp: 1500,
            max_mp: 1500,
            unassigned_stat_points: 0,
            is_admin: false,
            cosmetics: []
          }
        };

        setLeaderboard([sungJinWooEntry, ...transformedData]);
        setLeaderboardLastUpdated(new Date());
      } else {
        console.log('📊 No profiles data found - adding Sung Jin Woo as only entry');
        const sungJinWooEntry = {
          id: 'sung-jin-woo-special',
          xp: 999999,
          level: 100,
          rank: 'S',
          users: {
            name: 'Sung Jin Woo',
            hunter_name: 'Sung Jin Woo',
            avatar_url: '/sungjinwoo.png',
            base_body_url: '/sungjinwoo-monarch.png',
            current_class: 'Shadow Monarch',
            rank_tier: 10,
            current_title: 'Shadow Monarch',
            next_advancement_attempt: null,
            str_stat: 50,
            spd_stat: 50,
            end_stat: 50,
            int_stat: 50,
            lck_stat: 50,
            per_stat: 50,
            wil_stat: 50,
            current_hp: 1000,
            max_hp: 1000,
            current_mp: 500,
            max_mp: 500,
            unassigned_stat_points: 0,
            is_admin: false,
            cosmetics: []
          }
        };
        setLeaderboard([sungJinWooEntry]);
        setLeaderboardLastUpdated(new Date());
      }
    } catch (error) {
      console.error('💥 Failed to load leaderboard:', error);
    }
  }, []);

  const loadDungeons = useCallback(async () => {
    console.log('🎯 loadDungeons called - FETCHING FROM SUPABASE');
    try {
      const { data, error } = await supabase
        .from('dungeons')
        .select('*');

      console.log('📊 Supabase dungeons response:', { data, error, dataLength: data?.length });

      if (!error && data && data.length > 0) {
        console.log('✅ Dungeons loaded from Supabase:', data.length, 'dungeons');

        const currentTime = new Date();
        console.log('🕒 Current time:', currentTime.toISOString());

        const activeDungeons = data.filter((dungeon: any) => {
          if (!dungeon.scheduled_start) {
            console.log(`✅ Dungeon "${dungeon.name}" has no scheduled time, keeping it`);
            return true;
          }

          const startTime = new Date(dungeon.scheduled_start);
          const oneHourAfter = new Date(startTime.getTime() + (60 * 60 * 1000));

          console.log(`⏰ Dungeon "${dungeon.name}": start=${startTime.toISOString()}, oneHourAfter=${oneHourAfter.toISOString()}, current=${currentTime.toISOString()}`);

          const shouldKeep = currentTime < oneHourAfter;
          console.log(`🎯 Should keep "${dungeon.name}": ${shouldKeep} (${currentTime < oneHourAfter ? 'within 1 hour window' : 'expired'})`);

          return shouldKeep;
        });

        console.log(`⏰ Filtered ${data.length - activeDungeons.length} expired dungeons`);
        console.log('✅ Active dungeons after filtering:', activeDungeons.map((d: any) => d.name));

        const normalizedDungeons = activeDungeons.map((dungeon: any) => ({
          ...dungeon,
          xp_reward: dungeon.xp_reward,
          coin_reward: dungeon.coin_reward,
          xpReward: dungeon.xp_reward,
          coinReward: dungeon.coin_reward
        }));

        console.log('🔄 Setting normalized dungeons from database');
        setDungeons(normalizedDungeons);
      } else {
        console.log('📊 Database query failed or empty, using ACTIVE_DUNGEONS fallback');
        if (error) {
          console.error('❌ Supabase Error:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
        }

        const currentTime = new Date();
        const activeFallbackDungeons = ACTIVE_DUNGEONS.filter((dungeon: any) => {
          if (!dungeon.scheduled_start) return true;
          const startTime = new Date(dungeon.scheduled_start);
          const oneHourAfter = new Date(startTime.getTime() + (60 * 60 * 1000));
          return currentTime < oneHourAfter;
        });

        const normalizedDungeons = activeFallbackDungeons.map((dungeon: any) => ({
          ...dungeon,
          xp_reward: dungeon.xpReward || dungeon.xp_reward || 500,
          coin_reward: dungeon.coinReward || dungeon.coin_reward || 100,
          xpReward: dungeon.xpReward || dungeon.xp_reward || 500,
          coinReward: dungeon.coinReward || dungeon.coin_reward || 100
        }));

        console.log('Using ACTIVE_DUNGEONS fallback:', normalizedDungeons.length, 'dungeons');
        setDungeons(normalizedDungeons);
      }
    } catch (error) {
      console.error('❌ Error in loadDungeons:', error);
      console.log('Using ACTIVE_DUNGEONS emergency fallback');

      const currentTime = new Date();
      const activeEmergencyDungeons = ACTIVE_DUNGEONS.filter((dungeon: any) => {
        if (!dungeon.scheduled_start) return true;
        const startTime = new Date(dungeon.scheduled_start);
        const oneHourAfter = new Date(startTime.getTime() + (60 * 60 * 1000));
        return currentTime < oneHourAfter;
      });

      const normalizedDungeons = activeEmergencyDungeons.map((dungeon: any) => ({
        ...dungeon,
        xp_reward: dungeon.xpReward || dungeon.xp_reward || 500,
        coin_reward: dungeon.coinReward || dungeon.coin_reward || 100,
        xpReward: dungeon.xpReward || dungeon.xp_reward || 500,
        coinReward: dungeon.coinReward || dungeon.coin_reward || 100
      }));

      setDungeons(normalizedDungeons);
    }
  }, []);

  const loadShopItems = useCallback(async (forcedId?: string) => {
    // 1. Determine the ID
    const targetId = forcedId || user?.id || (typeof window !== 'undefined' ? localStorage.getItem('current_hunter_id') : null);

    console.log('🛒 SHOP SYNC: Scanning for Hunter ID:', targetId);

    try {
      const response = await fetch('/api/shop');
      const data = await response.json();
      if (data.shopItems) setShopItems(data.shopItems);

      // 2. CRITICAL FIX: Only query Supabase if we have a real UUID
      // We ignore 'default-user-id' and 'Hunter'
      if (targetId && targetId !== "default-user-id" && targetId !== "Hunter") {
        const { data: ownedData, error } = await supabase
          .from('user_cosmetics')
          .select('shop_item_id')
          .eq('hunter_id', targetId);

        if (error) {
          console.error('❌ Supabase Owned Items Error:', error.message);
          return;
        }

        if (ownedData) {
          const ownedIds = new Set(ownedData.map(row => String(row.shop_item_id)));
          setOwnedItemIds(ownedIds);
          console.log(`✅ Filter Active: Hiding ${ownedIds.size} owned items.`);
        }
      }
    } catch (error) {
      // 3. BETTER LOGGING: See the actual message next time
      console.error('❌ Shop Load Error:', error instanceof Error ? error.message : error);
    }
  }, [user?.id]);

  const loadActivities = useCallback(async () => {
    try {
      const hunterId = typeof window !== 'undefined' 
        ? localStorage.getItem('current_hunter_id') || localStorage.getItem('hunter_id')
        : null;
      if (!hunterId) {
        setActivities([]);
        return;
      }
      const response = await fetch(`/api/activities?hunter_id=${hunterId}`);
      if (response.ok) {
        const data = await response.json();
        const formattedActivities = data.activities.map((activity: any) => ({
          id: activity.strava_activity_id.toString(),
          date: new Date(activity.start_date).toISOString().split('T')[0],
          type: activity.type,
          distance: activity.distance,
          pace: calculatePace(activity.moving_time, activity.distance),
          elevation: activity.total_elevation_gain,
          xp: activity.xp_earned || calculateXP(activity),
          coins: activity.coins_earned || calculateCoins(activity),
          claimed: activity.claimed
        }));
        setActivities(formattedActivities);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  }, []);

  const loadCosmetics = useCallback(async () => {
    console.log('✨ Loading cosmetics...');
    const hunterId = typeof window !== 'undefined' 
      ? localStorage.getItem('current_hunter_id') || localStorage.getItem('hunter_id') || user.id
      : user.id;

    if (!hunterId) {
      console.log('⚠️ No hunter_id found, skipping cosmetics load.');
      return;
    }

    try {
      const response = await fetch(`/api/cosmetics?hunter_id=${hunterId}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Server Error (${response.status}):`, errorText);
        return;
      }

      const data = await response.json();
      console.log('✅ Cosmetics loaded:', data.cosmetics?.length || 0);
      setUser(prev => ({
        ...prev,
        cosmetics: data.cosmetics || []
      }));
    } catch (error: any) {
      console.error('💥 Network or Parsing error:', error.message);
    }
  }, [user.id]);

  const fetchProtocol = useCallback(async (forcedId?: string) => {
    const targetId = forcedId || user?.id;

    if (!targetId || targetId === "Hunter") {
      console.log('⏳ fetchProtocol: Waiting for valid Hunter ID...');
      return;
    }

    console.log('📡 Syncing with Vault via API for Hunter (Full Week):', targetId);

    try {
      const response = await fetch(`/api/training/protocol?hunter_id=${targetId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const sanitized = result.data.map((ex: any) => ({
          ...ex,
          sets_data: Array.isArray(ex.sets_data) ? ex.sets_data : []
        }));
        setTrainingProtocol(sanitized);
        console.log(`✅ System Archive Synchronized: ${sanitized.length} missions found for the week.`);
      } else {
        console.error('❌ Vault Sync Failed:', result.error);
      }
    } catch (err) {
      console.error('💥 Critical Link Failure:', err);
    }
  }, [user?.id]);

  const fetchNutrition = useCallback(async (forcedId?: string) => {
    const targetId = forcedId || user?.id;
    if (!targetId || targetId === "Hunter") return;

    try {
      // Fetch full week nutrition logs
      const response = await fetch(`/api/nutrition?hunter_id=${targetId}`);
      const result = await response.json();
      
      if (result.success) {
        setNutritionLogs(result.data || []);
        console.log(`✅ Nutrition Archives Synchronized: ${result.data?.length || 0} logs found for the week.`);
      } else {
        console.error('Failed to fetch nutrition via API:', result.error);
      }
    } catch (err) {
      console.error('Failed to fetch nutrition:', err);
    }
  }, [user?.id]);

  const checkAuthAndLoadData = useCallback(async () => {
    const timestamp = Date.now();
    console.log(`🚀 checkAuthAndLoadData STARTED at ${timestamp}`);
    try {
      console.log('🏰 Loading dungeons...');
      await loadDungeons();

      console.log('🛒 Loading shop items...');
      await loadShopItems();

      console.log('🔐 Checking authentication...');

      if (authUser) {
        console.log('✅ Supabase Auth user found:', authUser.id);

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (error || !profile) {
          console.log('❌ Profile not found for auth user, checking sessionStorage...');
        } else {
          console.log('👤 Profile loaded from Supabase Auth:', profile);

          // Fetch User Skills for Passives
          const { data: userSkills } = await supabase
            .from('user_skills')
            .select(`
              current_rank,
              skills (
                id,
                name,
                bonus_type,
                base_value
              )
            `)
            .eq('user_id', authUser.id);

          const { data: cosmetics } = await supabase
            .from('user_cosmetics')
            .select(`
              id,
              equipped,
              acquired_at,
              shop_items (
                id,
                name,
                description,
                image_url,
                slot,
                z_index,
                rarity,
                is_animated,
                animation_config,
                bonuses,
                scale,
                offset_x,
                offset_y,
                z_index
              )
            `)
            .eq('hunter_id', authUser.id);

          setUser(prev => ({
            ...prev,
            ...profile,
            name: profile.hunter_name, // Map for UI
            exp: profile.exp ?? 0,
            skill_points: profile.skill_points ?? 0,
            cosmetics: cosmetics || [],
            user_skills: userSkills || [], // Attach skills for stats
            equipped: { feet: null, wrist: null, body: null, weapon: null, back: null, aura: null, eyes: null, earrings: null, neck: null },
            submittedIds: [],
            completedDungeons: [],
            status: profile.status,
            is_admin: profile.is_admin
          }));

          // Check for daily_steps reset
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Normalize to start of today
          const lastResetDate = profile.last_steps_reset_at ? new Date(profile.last_steps_reset_at) : null;
          
          let updateRequired = false;
          const newDailySteps = 0;
          const newLastStepsResetAt = today.toISOString();

          if (!lastResetDate || lastResetDate.toDateString() !== today.toDateString()) {
            // It's a new day or never reset, perform reset
            console.log(`Resetting daily_steps for user ${authUser.id}. Old reset: ${profile.last_steps_reset_at}, New reset: ${newLastStepsResetAt}`);
            updateRequired = true;
          }

          if (updateRequired) {
            await fetch('/api/user', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: authUser.id, daily_steps: newDailySteps, last_steps_reset_at: newLastStepsResetAt }),
            });
          }

          await fetchProtocol(authUser.id);
          await fetchNutrition(authUser.id);

          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
      }

      const hunterId = typeof window !== 'undefined' ? localStorage.getItem('current_hunter_id') : null;
      
      if (!hunterId) {
        console.log('❌ No authentication found - user must log in');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/user?id=${hunterId}`);
      console.log('📡 Auth API response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('👤 User data loaded:', data.user);

        // Fetch User Skills for Passives
        const { data: userSkills } = await supabase
          .from('user_skills')
          .select(`
            current_rank,
            skills (
              id,
              name,
              bonus_type,
              base_value
            )
          `)
          .eq('user_id', hunterId);

        const userData = data.user;
        setUser({
          ...userData,
          name: userData.hunter_name, // Map for UI
          exp: userData.exp ?? 0,
          skill_points: userData.skill_points ?? 0,
          cosmetics: userData.cosmetics || [],
          user_skills: userSkills || [],
          equipped: { feet: null, wrist: null, body: null, weapon: null, back: null, aura: null, eyes: null, earrings: null, neck: null },
          submittedIds: [],
          completedDungeons: [],
            status: userData.status,
            is_admin: userData.is_admin,
            referral_code: userData.referral_code,
            referral_used: userData.referral_used,
            active_skin: userData.active_skin || 'default'
          });
        setIsAuthenticated(true);

        // Check for daily_steps reset for existing users
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of today
        const lastResetDate = userData.last_steps_reset_at ? new Date(userData.last_steps_reset_at) : null;

        let updateRequiredForExisting = false;
        const newDailyStepsForExisting = 0;
        const newLastStepsResetAtForExisting = today.toISOString();

        if (!lastResetDate || lastResetDate.toDateString() !== today.toDateString()) {
          // It's a new day or never reset, perform reset
          console.log(`Resetting daily_steps for user ${userData.id}. Old reset: ${userData.last_steps_reset_at}, New reset: ${newLastStepsResetAtForExisting}`);
          updateRequiredForExisting = true;
        }

        if (updateRequiredForExisting) {
          await fetch('/api/user', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userData.id, daily_steps: newDailyStepsForExisting, last_steps_reset_at: newLastStepsResetAtForExisting }),
          });
        }

        const pendingOnboarding = typeof window !== 'undefined' ? localStorage.getItem('pending_onboarding') : null;
        if (pendingOnboarding && userData.id) {
          try {
            const onboardingData = JSON.parse(pendingOnboarding);
            console.log('📝 Found pending onboarding data, saving to database...');
            
            const patchResponse = await fetch('/api/user', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: onboardingData.name,
                gender: onboardingData.gender
              }),
            });
            
            if (patchResponse.ok) {
              console.log('✅ Pending onboarding data saved to database');
              localStorage.removeItem('pending_onboarding');
              const updatedResponse = await fetch('/api/user');
              if (updatedResponse.ok) {
                const updatedData = await updatedResponse.json();
                setUser(prev => ({ ...prev, ...updatedData.user }));
              }
            } else {
              console.error('Failed to save pending onboarding data');
            }
          } catch (error) {
            console.error('Error saving pending onboarding:', error);
          }
        }

        if (userData.status === 'approved' || (userData.is_admin && userData.status === 'approved')) {
          if (userData.is_admin && userData.status !== 'approved') {
            fetch('/api/user', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'approved' }),
            }).catch(err => console.error('Failed to auto-approve admin:', err));
          }
          
          const localStorageCompleted = typeof window !== 'undefined' 
            ? localStorage.getItem(`onboarding_${userData.id}`) === 'completed'
            : false;
          const databaseCompleted = userData.onboarding_completed || false;
          const hasCompletedOnboarding = localStorageCompleted || databaseCompleted;

          setIsOnboarded(hasCompletedOnboarding);

          if (databaseCompleted && !localStorageCompleted && typeof window !== 'undefined') {
            localStorage.setItem(`onboarding_${userData.id}`, 'completed');
          }
        }

        console.log('✅ User authenticated, loading data...');

        console.log('🏃 About to call loadActivities...');
        await loadActivities();
        console.log('✅ loadActivities completed');

        console.log('🔄 About to call loadDungeons...');
        try {
          await loadDungeons();
          console.log('✅ loadDungeons call completed');
        } catch (dungeonError) {
          console.error('❌ loadDungeons threw error:', dungeonError);
        }

        await loadLeaderboard();
        await loadShopItems();
        await loadCosmetics();
        await fetchProtocol(userData.id);
        await fetchNutrition(userData.id);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Auth failed:', response.status, errorData);
        setIsAuthenticated(false);
        await loadLeaderboard();
      }
    } catch (error) {
      console.error('💥 Auth check failed:', error);
      setIsAuthenticated(false);
      await loadLeaderboard();
    } finally {
      setIsLoading(false);
    }
  }, [authUser, loadActivities, loadDungeons, loadLeaderboard, loadCosmetics, loadShopItems, fetchProtocol]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  return {
    user,
    setUser,
    isLoading,
    activities,
    setActivities,
    dungeons,
    leaderboard,
    shopItems,
    trainingProtocol,
    fetchProtocol,
    nutritionLogs,
    fetchNutrition,
    isAuthenticated,
    setIsAuthenticated,
    isOnboarded,
    setIsOnboarded,
    ownedItemIds,
    setOwnedItemIds,
    loadLeaderboard,
    loadDungeons,
    loadShopItems,
    loadActivities,
    loadCosmetics,
    leaderboardLastUpdated,
    setLeaderboardLastUpdated
  };
}
