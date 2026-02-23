"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LottieAnimation from '@/components/LottieAnimation';
import BackgroundParticles from '@/components/BackgroundParticles';
import AnimatedEquip from '@/components/AnimatedEquip';
import { GlobalTerminal } from '@/components/GlobalTerminal';
import { useAuth } from '@/components/AuthProvider';
import TrainingWidget from '@/components/TrainingWidget';
import DungeonView from '@/components/DungeonView';
import { useHunterData } from '@/hooks/useHunterData';

import GameModals from '@/components/managers/GameModals';

import OnboardingView from '@/components/views/OnboardingView';
import DashboardView from '@/components/views/DashboardView';
import SocialView from '@/components/views/SocialView';
import InventoryScreen from '@/components/views/InventoryScreen';
import GlobalGameLoop from '@/components/logic/GlobalGameLoop';
import { LoadingView, PendingView, RejectedView } from '@/components/views/StatusViews';
import WelcomeSequence from '@/components/views/WelcomeSequence';
import ParallaxBackground from '@/components/ParallaxBackground';
import RainEffect from '@/components/effects/RainEffect';
import SystemDataAccents from '@/components/ui/SystemDataAccents';
import GameBottomNav from '@/components/layout/GameBottomNav';

import {
  Trophy,
  ChevronRight,
  Settings,
  Activity as ActivityIcon,
  Sword,
  Crown,
  Clock,
  MapPin,
  CheckCircle2,
  Plus,
  Skull,
  Box,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Loader2,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  MessageSquare,
  X,
  Dumbbell,
  Trash2,
  Check,
  Zap,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Activity, Dungeon, GearItem, User, RANKS, RANK_COLORS } from '@/lib/types';
import { calculateLevel, getRank } from '@/lib/stats';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import { HunterHeader } from '@/components/HunterHeader';
import WorldMapView from '@/components/views/WorldMapView';
import ShopView from '@/components/ShopView';

// Removed GEAR_ITEMS - shop now pulls from database only

const MOCK_STRAVA_ACTIVITIES = [
];


// --- Utilities ---
export default function App() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  
  // Use centralized data hook
  const {
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
  } = useHunterData();

  // Square 1: Add the Fast Boot state
  const [fastBoot, setFastBoot] = useState<boolean>(false);

  // Initialize preference from storage on load
  useEffect(() => {
    const saved = localStorage.getItem('system_fast_boot') === 'true';
    setFastBoot(saved);
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isWelcomeComplete, setIsWelcomeComplete] = useState(false);
  
  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<User | null>(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [trainingModalInitialTab, setTrainingModalInitialTab] = useState<'training' | 'nutrition'>('training');

  const handleOpenTrainingModal = (initialTab: 'training' | 'nutrition' = 'training') => {
    setTrainingModalInitialTab(initialTab);
    setShowTrainingModal(true);
  };
  const [selectedDungeon, setSelectedDungeon] = useState<any>(null);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Purchase confirmation dialog
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<{
    show: boolean;
    item: any;
    reason: string;
    type: 'level' | 'class';
  } | null>(null);

  const [showStatusWindow, setShowStatusWindow] = useState(false);
  const [isOpeningDailyChest, setIsOpeningDailyChest] = useState(false);
  const [isOpeningGrandChest, setIsOpeningGrandChest] = useState(false);

  // Community feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [feedbackDaysUntilReset, setFeedbackDaysUntilReset] = useState(0);

  // Reward Modal state
  const [rewardModalData, setRewardModalData] = useState<any>(null);
  const [isChestAnimating, setIsChestAnimating] = useState(false);
  const [currentChestType, setCurrentChestType] = useState<'small' | 'silver' | 'medium' | 'large'>('small');

  const [seasonRewardModalData, setSeasonRewardModalData] = useState<any>(null);

  // Settings menu state
  const [showSettings, setShowSettings] = useState(false);

  // Toggle incognito mode
  const toggleIncognito = async () => {
    try {
      const newPrivateStatus = !user.is_private;
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: user.id,
          is_private: newPrivateStatus 
        }),
      });

      if (response.ok) {
        // Update local user state
        setUser({ ...user, is_private: newPrivateStatus });
        showNotification(newPrivateStatus ? 'Incognito Mode ON' : 'Incognito Mode OFF', 'success');
      } else {
        console.error('Failed to toggle incognito mode');
      }
    } catch (error) {
      console.error('Error toggling incognito mode:', error);
    }
  };

  useEffect(() => {
    const checkSeasonRewards = async () => {
      if (user && user.id) {
        const response = await fetch(`/api/user/season-rewards?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setSeasonRewardModalData(data);
          }
        }
      }
    };

    if (isAuthenticated && isOnboarded) {
      checkSeasonRewards();
    }
  }, [isAuthenticated, isOnboarded, user]);


  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSettings && !target.closest('.settings-menu') && !target.closest('.settings-button')) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);


  // Load community feedback
  const loadCommunityFeedback = useCallback(async () => {
    try {
      const response = await fetch(`/api/social/feedback?userId=${user?.id || ''}`);
      if (response.ok) {
        const data = await response.json();
        setFeedbackItems(data.feedback || []);
        setFeedbackDaysUntilReset(data.daysUntilReset || 0);
      }
    } catch (error) {
      console.error('Error loading community feedback:', error);
    }
  }, [user?.id]);

  // Handle feedback voting
  const handleFeedbackVote = async (feedbackId: string, voteType: 'resonate' | 'interfere') => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/social/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedbackId,
          voteType
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showNotification(data.message, 'success');
        // Refresh feedback data
        loadCommunityFeedback();
      } else {
        showNotification(data.error || `Failed to ${voteType}`, 'error');
      }
    } catch (error) {
      console.error(`Error ${voteType}ing on feedback:`, error);
      showNotification(`Error ${voteType}ing on feedback`, 'error');
    }
  };

  // Load community feedback when modal opens
  useEffect(() => {
    if (showFeedbackModal) {
      loadCommunityFeedback();
    }
  }, [showFeedbackModal, loadCommunityFeedback]);

  // Reload cosmetics when inventory tab is opened
  useEffect(() => {
    if (activeTab === 'inventory' && isAuthenticated && user.id) {
      loadCosmetics();
    }
  }, [activeTab, isAuthenticated, user.id, loadCosmetics]);

  // Listen for auth state changes
  // No cookie-based session management - users must log in manually each time

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

  const getAvatarPath = (gender: string) => {
    switch (gender) {
      case 'Male': return '/NoobMan.png';
      case 'Female': return '/NoobWoman.png';
      case 'Non-binary': return '/Noobnonbinary.png';
      default: return '/NoobMan.png';
    }
  };

  const level = useMemo(() => {
    // Trust the database level as the source of truth
    if (user.level !== undefined) {
      return user.level;
    }
    // Fallback only if level is missing (should not happen for logged in users)
    return calculateLevel(user.exp || 0);
  }, [user.level, user.exp]);
  const rank = useMemo(() => {
    // Don't calculate rank if user data isn't loaded yet
    if (!user.exp && !user.level && !user.rank) {
      return 'E'; // Default to E rank while loading
    }
    return user.rank || getRank(level);
  }, [level, user.rank, user.exp, user.level]);

  const equippedItems = useMemo(() => {
    if (!user || !user.cosmetics) return [];
    return user.cosmetics.filter((c: any) => c.equipped);
  }, [user]);

  const totalStats = useMemo(() => {
    const stats: Record<string, number> = {};
    if (!equippedItems) return stats;

    equippedItems.forEach((cosmetic: any) => {
      const item = cosmetic.shop_items;
      if (item && item.bonuses) {
        item.bonuses.forEach((bonus: any) => {
          stats[bonus.type] = (stats[bonus.type] || 0) + bonus.value;
        });
      }
    });
    return stats;
  }, [equippedItems]);

  const handleStravaConnect = () => {
    console.log('Strava integration is coming soon! We\'re currently awaiting API approval from Strava for multi-user access. In the meantime, you can upload screenshots of your activities manually.');
  };

  const handleLevelUp = async (activity: any) => {
    if (user.slotsUsed >= 3 || activity.claimed) return;

    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activityId: activity.id }),
      });

      if (response.ok) {
        const result = await response.json();
        setUser(prev => {
          const newExp = prev.exp + result.exp_earned;
          // Trust the server to return the new level in the result or fetch it separately
          // For now, if result.new_level exists use it, otherwise keep current level
          const newLevel = result.new_level || prev.level;
          console.log(`📈 XP Update: ${prev.exp} → ${newExp} XP | Level: ${prev.level} → ${newLevel}`);
          return {
            ...prev,
            exp: newExp,
            level: newLevel,
            coins: prev.coins + result.coins_earned,
            slotsUsed: prev.slotsUsed + 1,
            submittedIds: [...prev.submittedIds, activity.id]
          };
        });

        // Update activity as claimed
        setActivities(prev => prev.map(act =>
          act.id === activity.id ? { ...act, claimed: true } : act
        ));

        // Refresh leaderboard to show updated rankings
        await loadLeaderboard();
      } else {
        const error = await response.json();
        console.error('Failed to claim activity:', error.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Claim error:', error);
      console.error('Failed to claim activity');
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('screenshot', file);
      
      // Include hunterId as fallback for users without cookie session
      const hunterId = (typeof window !== 'undefined'
        ? localStorage.getItem('current_hunter_id') || localStorage.getItem('hunter_id')
        : null) || user.id;
      if (hunterId) {
        formData.append('hunterId', hunterId);
      }

      const response = await fetch('/api/screenshot', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      const result = await response.json();

      if (response.ok) {
        // Add the new activity to the list
        const newActivity = {
          id: result.activity.strava_activity_id,
          date: new Date(result.activity.start_date).toISOString().split('T')[0],
          type: result.activity.type,
          distance: result.activity.distance,
          pace: calculatePace(result.activity.moving_time, result.activity.distance),
          elevation: result.activity.total_elevation_gain,
          exp: result.activity.exp_earned,
          coins: result.activity.coins_earned,
          claimed: false
        };

        setActivities(prev => [newActivity, ...prev]);

        // Update user state with quest progress and steps reward from API
        if (result.quest_progress || result.rewards?.steps_earned) {
          setUser(prev => ({
            ...prev,
            ...(result.quest_progress && {
              manual_daily_completions: result.quest_progress.manual_daily_completions,
              manual_weekly_streak: result.quest_progress.manual_weekly_streak,
              last_submission_date: result.quest_progress.last_submission_date
            }),
            ...(result.rewards?.steps_earned != null && {
              steps_banked: (prev.steps_banked ?? 0) + result.rewards.steps_earned
            })
          }));
        }

        console.log(`Activity analyzed! Earned ${result.rewards.exp_earned} EXP, ${result.rewards.coins_earned} coins${result.rewards.steps_earned ? `, ${result.rewards.steps_earned} steps` : ''}!`);
      } else {
        setUploadError(result.details || result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload screenshot. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenSmallChest = async () => {
    if ((user.daily_completions || 0) < 1) return;

    try {
      // Small Chest: 200 Coins + 500 XP
      const rewards = {
        coins: 200,
        exp: 500
      };

      // Update user state
      setUser(prev => ({
        ...prev,
        coins: (prev.coins || 0) + rewards.coins,
        exp: (prev.exp || 0) + rewards.exp,
        daily_completions: 0 // Reset daily completions after claiming
      }));

      // Update database
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coins: (user.coins || 0) + rewards.coins,
          exp: (user.exp || 0) + rewards.exp,
          daily_completions: 0
        })
      });

      console.log(`🎁 Small Chest opened! +${rewards.coins} coins, +${rewards.exp} EXP`);
    } catch (error) {
      console.error('Failed to open small chest:', error);
    }
  };

  const handleOpenGrandChest = async () => {
    if ((user.weekly_streak_count || 0) < 7) return;

    try {
      // Grand Chest: 1,000 Coins + 2,000 XP + +2 points to a random Base Stat
      const baseStats = ['str_stat', 'spd_stat', 'end_stat', 'int_stat', 'lck_stat', 'per_stat', 'wil_stat'];
      const randomStat = baseStats[Math.floor(Math.random() * baseStats.length)];

      const rewards = {
        coins: 1000,
        exp: 2000,
        statBoost: { [randomStat]: 2 }
      };

      // Update user state
      setUser(prev => ({
        ...prev,
        coins: (prev.coins || 0) + rewards.coins,
        exp: (prev.exp || 0) + rewards.exp,
        [randomStat]: ((prev as any)[randomStat] || 0) + 2,
        weekly_streak_count: 0, // Reset weekly streak after claiming
        grand_chest_available: false
      }));

      // Update database
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coins: (user.coins || 0) + rewards.coins,
          exp: (user.exp || 0) + rewards.exp,
          [randomStat]: ((user as any)[randomStat] || 0) + 2,
          weekly_streak_count: 0,
          grand_chest_available: false
        })
      });

      console.log(`💎 Grand Chest opened! +${rewards.coins} coins, +${rewards.exp} EXP, +2 ${randomStat.replace('_stat', '').toUpperCase()}!`);
    } catch (error) {
      console.error('Failed to open grand chest:', error);
    }
  };

  const [pendingReward, setPendingReward] = useState<any>(null);

  const handleClaimReward = async (
    source: 'daily' | 'weekly' | 'streak' | 'special' | 'manual_daily' | 'manual_weekly',
    explicitType?: 'small' | 'silver' | 'medium' | 'large'
  ) => {
    // 1. Validation Logic
    if (source === 'daily' && (user.daily_completions || 0) < 1) return;
    if (source === 'weekly' && (user.weekly_streak_count || 0) < 7) return;
    if (source === 'manual_daily' && (user.manual_daily_completions || 0) < 1) return;
    if (source === 'manual_weekly' && (user.manual_weekly_streak || 0) < 7) return;
    
    // 2. Determine Chest Type
    let chestType: 'small' | 'silver' | 'medium' | 'large' = 'small';
    
    if (explicitType) {
      chestType = explicitType;
    } else {
      if (source === 'daily' || source === 'manual_daily') chestType = 'small';
      if (source === 'streak') chestType = 'medium';
      if (source === 'weekly' || source === 'manual_weekly') chestType = 'large';
    }

    setCurrentChestType(chestType);

    try {
      // 3. 🎲 CALCULATE REWARDS
      const baseStats = ['str_stat', 'spd_stat', 'end_stat', 'int_stat', 'lck_stat', 'per_stat', 'wil_stat'];
      const randomStatKey = baseStats[Math.floor(Math.random() * baseStats.length)];
      
      let rewards = { 
        coins: 0, 
        exp: 0, 
        gemsEarned: 0,
        title: '',
        statBoost: undefined as Record<string, number> | undefined 
      };

      switch (chestType) {
        case 'small':
          rewards.title = "Small Supply Crate";
          rewards.coins = Math.floor(Math.random() * (300 - 100 + 1)) + 100;
          rewards.exp = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
          break;
        case 'silver':
          rewards.title = "Silver Supply Crate";
          rewards.coins = Math.floor(Math.random() * (300 - 150 + 1)) + 150;
          rewards.exp = Math.floor(Math.random() * (180 - 80 + 1)) + 80;
          if (Math.random() < 0.05) rewards.gemsEarned = 1;
          break;
        case 'medium':
          rewards.title = "Combat Readiness Cache";
          rewards.coins = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;
          rewards.exp = Math.floor(Math.random() * (800 - 400 + 1)) + 400;
          if (Math.random() < 0.20) rewards.statBoost = { [randomStatKey]: 1 };
          if (Math.random() < 0.10) rewards.gemsEarned = Math.floor(Math.random() * 2) + 1;
          break;
        case 'large':
          rewards.title = "Grand Monarch Chest";
          rewards.coins = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
          rewards.exp = Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500;
          rewards.statBoost = { [randomStatKey]: 3 }; 
          if (Math.random() < 0.20) rewards.gemsEarned = Math.floor(Math.random() * 4) + 1;
          break;
      }

      // 4. Update Database
      const updatePayload: any = {
        id: user.id,
        coins: (user.coins || 0) + rewards.coins,
        exp: (user.exp || 0) + rewards.exp,
        gems: (user.gems || 0) + rewards.gemsEarned,
        ...(source === 'daily' && { daily_completions: 0 }),
        ...(source === 'weekly' && { weekly_streak_count: 0, grand_chest_available: false }),
        ...(source === 'manual_daily' && { manual_daily_completions: 0 }),
        ...(source === 'manual_weekly' && { manual_weekly_streak: 0 }),
      };

      if (rewards.statBoost) {
        const key = Object.keys(rewards.statBoost)[0];
        updatePayload[key] = ((user as any)[key] || 0) + (rewards.statBoost[key] || 0);
      }

      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      setUser(prev => ({ ...prev, ...updatePayload }));

      // 5. STAGE THE REWARD BUT WAIT FOR CLICK
      setPendingReward({
        title: rewards.title,
        coins: rewards.coins,
        exp: rewards.exp,
        gemsEarned: rewards.gemsEarned,
        statBoost: rewards.statBoost
      });
      setIsChestAnimating(true); // Open the animation modal

    } catch (error) {
      console.error("Chest Error:", error);
      setIsChestAnimating(false);
    } finally {
      setIsOpeningDailyChest(false);
      setIsOpeningGrandChest(false);
    }
  };

  const finalizeReward = () => {
    setIsChestAnimating(false);
    if (pendingReward) {
      setRewardModalData(pendingReward);
      setPendingReward(null);
    }
  };

  const handleAvatarChange = async (avatarImage: string, gender: string) => {
    // OPTIMISTIC UPDATE START
    const previousUser = { ...user };
    setUser(prev => ({
      ...prev,
      avatar: avatarImage,
      gender: gender
    }));
    // OPTIMISTIC UPDATE END

    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id, // Ensure ID is passed for consistency with the API expectation
          avatar: avatarImage,
          gender: gender
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update avatar');
      }

      const data = await response.json();
      console.log('✅ Avatar updated successfully');

      // The server response might contain normalized data, so we update again to be sure
      if (data.user) {
         setUser(prev => ({
           ...prev,
           ...data.user
         }));
      }

    } catch (error) {
      console.error('Failed to update avatar:', error);
      // Rollback on error
      setUser(previousUser);
      showNotification('Failed to update avatar', 'error');
    }
  };

  const handleBuyItem = async (item: any, currency: 'coins' | 'gems' | 'both' = 'coins') => {
    const itemPrice = currency === 'gems' ? item.gem_price : item.price;
    
    // Check if user is logged in - try multiple sources
    const hunterIdFromStorage = typeof window !== 'undefined'
      ? localStorage.getItem('current_hunter_id') || localStorage.getItem('hunter_id')
      : null;
    const hunterId = hunterIdFromStorage || user.id;
    
    if (!hunterId) {
      console.log('Please log in to purchase items');
      router.push('/login');
      return;
    }

    // Check level requirement
    if (item.min_level && user.level < item.min_level) {
      setPurchaseConfirmation({
        show: true,
        item: item,
        reason: `Level ${item.min_level} required (you are level ${user.level})`,
        type: 'level'
      });
      return;
    }

    // Check class requirement
    if (item.class_req && item.class_req !== 'All' && user.current_class !== item.class_req) {
      setPurchaseConfirmation({
        show: true,
        item: item,
        reason: `${item.class_req} class required (you are ${user.current_class})`,
        type: 'class'
      });
      return;
    }

    // Auto-proceed with purchase (confirmation removed)

    try {
      setIsUploading(true);

      // Use unified shop purchase API for all items
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopItemId: item.id,
          hunterId: hunterId || user.id,
          currency: currency
        })
      });

      const data = await response.json();
      if (response.ok) {
        // All items (including avatars) are now handled as cosmetics
        setUser(prev => ({
          ...prev,
          ...(currency === 'both'
            ? { coins: data.newCoinBalance, gems: data.newGemBalance }
            : { [currency]: data.newBalance }
          ),
          cosmetics: [...(prev.cosmetics || []), data.cosmetic]
        }));

        // Immediately hide the purchased item from shop
        setOwnedItemIds(prev => {
          const newSet = new Set([...prev, item.id]);
          console.log('🛒 PURCHASE: Added item to owned set:', item.id, 'Total owned:', newSet.size);
          return newSet;
        });

        console.log('✅ Item purchased, cosmetics updated:', data.cosmetic);
        console.log(`Successfully purchased ${item.name}!`);
        showNotification(`Successful/Check Inventory (Avatars/Background in the top right)`, 'success');

        // Reload user data to ensure cosmetics are fully loaded with relationships
        setTimeout(async () => {
          const hunterId = (typeof window !== 'undefined'
            ? localStorage.getItem('current_hunter_id') || localStorage.getItem('hunter_id')
            : null) || user.id;
          if (hunterId) {
            const userResponse = await fetch(`/api/user?id=${hunterId}`);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              setUser(prev => ({
                ...prev,
                ...userData.user,
                cosmetics: userData.user.cosmetics || prev.cosmetics
              }));
            }
          }
        }, 500);
      } else {
        console.error('Failed to purchase item:', data.error || 'Unknown error');

        // Show user-friendly error messages
        if (data.error === 'You already own this item') {
          showNotification('You already own this item!', 'error');
        } else if (data.error === 'Insufficient coins') {
          showNotification('Not enough coins!', 'error');
        } else {
          showNotification('Purchase failed. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      console.error('Failed to purchase item');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle purchase confirmation responses
  const handlePurchaseConfirmation = async (confirmed: boolean) => {
    if (!confirmed || !purchaseConfirmation) {
      setPurchaseConfirmation(null);
      return;
    }

    const item = purchaseConfirmation.item;
    const itemPrice = item.price;

    // Check if user is logged in - try multiple sources
    const hunterIdFromStorage = typeof window !== 'undefined'
      ? localStorage.getItem('current_hunter_id') || localStorage.getItem('hunter_id')
      : null;
    const hunterId = hunterIdFromStorage || user.id;

    if (!hunterId) {
      console.log('Please log in to purchase items');
      router.push('/login');
      return;
    }

    // Check Coins (skip other validations since user confirmed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', hunterId)
      .single();

    if (profile && profile.coins < itemPrice) {
      showNotification('Insufficient coins', 'error');
      setPurchaseConfirmation(null);
      return;
    }

    try {
      setIsUploading(true);
      setPurchaseConfirmation(null); // Close dialog

      // Use unified shop purchase API for all items
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopItemId: item.id,
          hunterId: hunterId || user.id
        })
      });

      const data = await response.json();
      if (response.ok) {
        // All items (including avatars) are now handled as cosmetics
        setUser(prev => ({
          ...prev,
          coins: data.newBalance,
          cosmetics: [...(prev.cosmetics || []), data.cosmetic]
        }));

        // Immediately hide the purchased item from shop
        setOwnedItemIds(prev => {
          const newSet = new Set([...prev, item.id]);
          console.log('🛒 PURCHASE: Added item to owned set:', item.id, 'Total owned:', newSet.size);
          return newSet;
        });

        console.log('✅ Item purchased, cosmetics updated:', data.cosmetic);
        console.log(`Successfully purchased ${item.name}!`);
        showNotification(`Successful/Check Inventory (Avatars/Background in the top right)`, 'success');

        // Reload user data to ensure cosmetics are fully loaded with relationships
        setTimeout(async () => {
          const hunterId = (typeof window !== 'undefined'
            ? localStorage.getItem('current_hunter_id') || localStorage.getItem('hunter_id')
            : null) || user.id;
          if (hunterId) {
            const userResponse = await fetch(`/api/user?id=${hunterId}`);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              setUser(prev => ({
                ...prev,
                ...userData.user,
                cosmetics: userData.user.cosmetics || prev.cosmetics
              }));
            }
          }
        }, 500);
      } else {
        console.error('Failed to purchase item:', data.error || 'Unknown error');

        // Show user-friendly error messages
        if (data.error === 'You already own this item') {
          showNotification('You already own this item!', 'error');
        } else if (data.error === 'Insufficient coins') {
          showNotification('Not enough coins!', 'error');
        } else {
          showNotification('Purchase failed. Please try again.', 'error');
        }
      }
    } catch (error: unknown) {
      console.error('Purchase error:', error);
      console.error('Failed to purchase item');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Error purchasing item: ${errorMessage}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEquipCosmetic = async (cosmeticId: string, equipped: boolean) => {
    if (!user?.id) return;

    // OPTIMISTIC UPDATE START
    const previousUser = { ...user }; // Backup for rollback

    // Find the item being toggled to get its slot
    const targetCosmetic = user.cosmetics?.find((c: any) => c.id === cosmeticId);
    const targetSlot = targetCosmetic?.shop_items?.slot;
    const isAccessory = ['accessory', 'jewelry', 'charms', 'scarves', 'earrings'].includes(targetSlot);

    // Apply optimistic changes
    setUser(prev => {
      const newCosmetics = prev.cosmetics?.map((c: any) => {
        // 1. The item being toggled
        if (c.id === cosmeticId) {
          return { ...c, equipped };
        }
        
        // 2. If equipping a non-accessory, unequip others in the same slot
        if (equipped && !isAccessory && targetSlot && c.shop_items?.slot === targetSlot) {
          return { ...c, equipped: false };
        }

        return c;
      });

      return {
        ...prev,
        cosmetics: newCosmetics || []
      };
    });
    // OPTIMISTIC UPDATE END

    try {
      const response = await fetch('/api/cosmetics/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cosmeticId, equipped, hunterId: user.id })
      });

      if (response.ok) {
        const { updatedCosmetics, updatedProfile } = await response.json();
        // Update with authoritative server state
        setUser(prev => ({
          ...prev,
          ...(updatedProfile || {}),
          cosmetics: updatedCosmetics
        }));
        showNotification(equipped ? 'Item equipped!' : 'Item unequipped!', 'success');
      } else {
        const { error } = await response.json();
        // Rollback on error
        setUser(previousUser);
        showNotification(`Error: ${error}`, 'error');
      }
    } catch (err) {
      // Rollback on error
      setUser(previousUser);
      showNotification('An unexpected error occurred.', 'error');
    }
  };


  const getAvatarIcon = () => {
    // For now, use a default avatar since we don't store gender in the new User interface
    return user.avatar_url || '👤';
  };

  // --- Gatekeeper Screens (Status, Auth, Onboarding) ---

  // 1. Onboarding / Auth Gate
  if (!isAuthenticated || (isAuthenticated && !isOnboarded)) {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-black text-cyan-400 text-xs font-mono tracking-[0.3em] uppercase">
            Initializing Hunter System…
          </div>
        }
      >
        <OnboardingView 
          onAuthenticated={(profile) => {
            // This ensures page.tsx knows the user logged in
            setUser({
              ...profile,
              name: profile.hunter_name,
              exp: Number(profile.exp || 0),
              coins: profile.coins || 0,
              gems: profile.gems || 0,
              level: calculateLevel(profile.exp || 0),
              rank: profile.rank || 'E',
              cosmetics: profile.cosmetics || [],
              equipped: { feet: null, wrist: null, body: null, weapon: null, back: null, aura: null, eyes: null, earrings: null, neck: null },
              submittedIds: [],
              completedDungeons: []
            });
            setIsAuthenticated(true);
            
            if (profile.onboarding_completed) {
              setIsOnboarded(true);
              localStorage.setItem(`onboarding_${profile.id}`, 'completed');
            }
          }} 
        />
      </React.Suspense>
    );
  }

  // 3. Pending State
  if (isAuthenticated && user.status === 'pending') {
    return <PendingView userName={user.name || ''} />;
  }

  // 4. Rejected State
  if (isAuthenticated && user.status === 'rejected' && !user.is_admin) {
    return <RejectedView />;
  }

  // 5. Welcome Back Animation (Only for approved, onboarded users)
  // We check !isWelcomeComplete to show the animation
  if (isAuthenticated && user.status === 'approved' && isOnboarded && !isWelcomeComplete) {
     return (
       <WelcomeSequence 
         user={user} 
         onComplete={() => setIsWelcomeComplete(true)} 
       />
     );
  }


  // --- Main App Dashboard ---
  return (
    <div className="min-h-screen text-gray-100 font-sans selection:bg-cyan-500/30 relative pb-4">

      {/* Optimized Background - Replaces the old div with style={{ transform... }} */}
    <ParallaxBackground />

    {/* The Silent Engine */}
    <GlobalGameLoop 
      user={user}
      setUser={setUser}
      isAuthenticated={isAuthenticated}
      loadDungeons={loadDungeons}
      loadShopItems={loadShopItems}
    />

    {/* Dark overlay for UI readability */}
    <div className="fixed inset-0 bg-black/70 pointer-events-none z-10"></div>

    {/* Main Content Container */}
    <div className="relative z-20">

      {/* Rain Effect */}
        <RainEffect />

      {/* System Data Accents */}
      <SystemDataAccents />

      {/* Background Particles */}
      <BackgroundParticles className="" />

      {/* Previous background effects for layering */}
      <div className="fixed inset-0 bg-scanline z-0 pointer-events-none opacity-30" />
      <div className="fixed inset-0 bg-grid-mesh z-0 pointer-events-none opacity-20" />
      
      <HunterHeader
        user={user}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        onAvatarClick={() => setSelectedAvatar(user)}
        setShowStatusWindow={setShowStatusWindow}
        fastBoot={fastBoot}
        setFastBoot={setFastBoot}
        showNotification={showNotification}
        toggleIncognito={toggleIncognito}
        setIsAuthenticated={setIsAuthenticated}
        setIsOnboarded={setIsOnboarded}
        setUser={setUser}
      />

      <main className="pb-40 sm:pb-32 px-4 pt-24 max-w-lg mx-auto relative z-10">
        {activeTab === 'dashboard' && (
          <DashboardView
            user={user}
            setUser={setUser}
            level={level}
            rank={rank}
            setActiveTab={setActiveTab}
            setSelectedAvatar={setSelectedAvatar}
            showNotification={showNotification}
            trainingProtocol={trainingProtocol}
            fetchProtocol={fetchProtocol}
            nutritionLogs={nutritionLogs}
            fetchNutrition={fetchNutrition}
            setShowTrainingModal={handleOpenTrainingModal}
            dungeons={dungeons}
            selectedDungeon={selectedDungeon}
            setSelectedDungeon={setSelectedDungeon}
            activities={activities}
            handleScreenshotUpload={handleScreenshotUpload}
            handleLevelUp={handleLevelUp}
            handleClaimReward={handleClaimReward}
            isUploading={isUploading}
            uploadError={uploadError}
            isOpeningDailyChest={isOpeningDailyChest}
            isOpeningGrandChest={isOpeningGrandChest}
          />
        )}

        {activeTab === 'shop' && (
          <ShopView user={user} shopItems={shopItems} setUser={setUser} handleBuyItem={handleBuyItem} />
        )}

        {activeTab === 'inventory' && (
          <InventoryScreen 
            user={user} 
            shopItems={shopItems} 
            handleEquipCosmetic={handleEquipCosmetic}
            equippedItems={equippedItems}
            totalStats={totalStats}
          />
        )}

        {activeTab === 'leaderboard' && (
          <SocialView
            user={user}
            setUser={setUser}
            leaderboard={leaderboard}
            loadLeaderboard={loadLeaderboard}
            showNotification={showNotification}
            setSelectedAvatar={setSelectedAvatar}
          />
        )}

        {activeTab === 'worldmap' && (
          <WorldMapView user={user} setUser={setUser} setActiveTab={setActiveTab} />
        )}

        {activeTab === 'dungeon-signup' && (
          <DungeonView
            user={user}
            dungeons={dungeons}
            activeTab="dungeon-signup"
            onNavigate={setActiveTab}
            showNotification={showNotification}
            setUser={setUser}
            level={level}
            rank={rank}
            onAvatarClick={setSelectedAvatar}
            selectedDungeon={selectedDungeon}
            setSelectedDungeon={setSelectedDungeon}
          />
        )}



      </main>

      <GameBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Modals */}
      <GameModals
        selectedAvatar={selectedAvatar}
        setSelectedAvatar={setSelectedAvatar}
        user={user}
        notification={notification}
        purchaseConfirmation={purchaseConfirmation}
        setPurchaseConfirmation={setPurchaseConfirmation}
        handlePurchaseConfirmation={handlePurchaseConfirmation}
        isUploading={isUploading}
        showStatusWindow={showStatusWindow}
        setShowStatusWindow={setShowStatusWindow}
        setUser={setUser}
        showTrainingModal={showTrainingModal}
        setShowTrainingModal={setShowTrainingModal}
        initialTab={trainingModalInitialTab}
        trainingProtocol={trainingProtocol}
        nutritionLogs={nutritionLogs}
        fetchProtocol={fetchProtocol}
        fetchNutrition={fetchNutrition}
        showNotification={showNotification}
        handleClaimReward={handleClaimReward}
        isChestAnimating={isChestAnimating}
        currentChestType={currentChestType}
        onChestAnimationComplete={finalizeReward}
        rewardModalData={rewardModalData}
        setRewardModalData={setRewardModalData}
        seasonRewardModalData={seasonRewardModalData}
        setSeasonRewardModalData={setSeasonRewardModalData}
      />

      </div> {/* Close Main Content Container */}
    </div>
  );
}
