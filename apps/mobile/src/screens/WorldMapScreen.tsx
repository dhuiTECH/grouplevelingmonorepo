import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, ScrollView, ActivityIndicator, Alert, StatusBar, Animated } from 'react-native';
import { Image } from 'expo-image';
import { InteractionModal } from '@/components/modals/InteractionModal';
import Toast from 'react-native-toast-message';
import { LevelUpModal } from '@/components/modals/LevelUpModal';
import { RaidCombatModal } from '@/components/modals/RaidCombatModal';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useExploration } from '@/hooks/useExploration';
import { useStepTracker } from '@/hooks/useStepTracker';
import { useTutorial } from '@/context/TutorialContext';
import LayeredAvatar from '@/components/LayeredAvatar';
import { TravelMenu } from '@/components/modals/TravelMenu';
import { useNavigation } from '@react-navigation/native';
import { usePets } from '@/hooks/usePets';
import { useActivePet } from '@/contexts/ActivePetContext';
import Reanimated, { useAnimatedRef, useSharedValue, useDerivedValue, useAnimatedStyle, useAnimatedReaction, runOnJS, withTiming, useFrameCallback } from 'react-native-reanimated';
import { useTransition } from '@/context/TransitionContext';
import { makeImageFromView, SkImage, Canvas, RadialGradient, vec, Rect as SkiaRect, Text as SkiaText, useFont, Blur, Skia, Paint } from '@shopify/react-native-skia';
import { mapNodeIcon } from '@/utils/assetMapper';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, G, Rect, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { SkiaWorldMap } from '../components/world-map/SkiaWorldMap';
import { VirtualJoystick } from '../components/world-map/VirtualJoystick';
import { PetSprite } from '../components/PetSprite';

// --- SVGs ---
const TargetCrosshairIcon = ({ color = '#ff4444', size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="9" />
    <Line x1="22" y1="12" x2="18" y2="12" />
    <Line x1="6" y1="12" x2="2" y2="12" />
    <Line x1="12" y1="6" x2="12" y2="2" />
    <Line x1="12" y1="22" x2="12" y2="18" />
    <Circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
  </Svg>
);

const CompassIcon = ({ color = '#00E5FF', size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="9" />
    <Polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </Svg>
);

const FootprintsIcon = ({ color = '#00E5FF', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
    <Path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
    <Path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" />
    <Path d="M16 17h4" />
    <Path d="M4 13h4" />
  </Svg>
);

const WalkingIcon = ({ color = '#00E5FF', size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
  </Svg>
);

// --- Reusable Holographic Glass Wrapper ---
const HolographicGlass = ({ children, style, contentStyle, hideGlow }: { children: React.ReactNode, style?: any, contentStyle?: any, hideGlow?: boolean }) => {
  return (
    <View style={[styles.glassWrapper, style]}>
      {/* 1. Background glow - only if not hidden */}
      {!hideGlow && <View style={styles.glowShadow} />}
      
      {/* 2. Glass Blur Background */}
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* 3. Holographic Gradient Background */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.05)', 'rgba(0, 229, 255, 0.02)', 'rgba(0, 0, 0, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* 4. ACTUAL CONTENT (Normal Flow) */}
      <View style={[styles.gradientSurface, contentStyle]}>
        {children}
      </View>
    </View>
  );
};

// --- Custom Step Counter with Fixed Android Glow ---
// The "rectangle glow" bug on Android happens because the text shadow is clipped 
// to the exact bounding box of the Text component. By adding padding, we push the 
// bounding box outwards, giving the shadow room to fade naturally.
const GlowingStepCounter = ({ steps }: { steps: number }) => {
  const text = steps.toLocaleString();
  
  return (
    <View style={styles.topPillTextWrapper}>
      <Text style={styles.topPillText}>
        {text}
      </Text>
    </View>
  );
};


const { width, height } = Dimensions.get('window');
const TILE_SIZE = 48; // Standardized to match web editor

export const WorldMapScreen = () => {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAuth();
  const { playTrack } = useAudio();
  const { pets } = usePets();
  const { activePetId } = useActivePet();
  const activePet = pets.find(p => p.id === activePetId) ?? (pets.length > 0 ? pets[0] : null);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [mapSettings, setMapSettings] = useState<any>(null);
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const velocityX = useSharedValue(0);
  const velocityY = useSharedValue(0);
  const isSprinting = useSharedValue(false);

  // Core world + UI state
  const [travelMenuVisible, setTravelMenuVisible] = useState(false);
  const [encounter, setEncounter] = useState<any | null>(null);
  const [interactionVisible, setInteractionVisible] = useState(false);
  const [activeInteraction, setActiveInteraction] = useState<any | null>(null);
  const [previousLevel, setPreviousLevel] = useState(user?.level || 1);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [raidModalVisible, setRaidModalVisible] = useState(false);
  const [activeRaid, setActiveRaid] = useState<any | null>(null);
  const [systemNews, setSystemNews] = useState<any[]>([]);
  const [navigationTarget, setNavigationTarget] = useState<any | null>(null);

  // Party presence
  const [partyMembersOnline, setPartyMembersOnline] = useState<Map<string, any>>(new Map());
  const presenceChannelRef = useRef<any>(null);

  // World -> battle transition
  const viewRef = useAnimatedRef<View>();
  const { startTransition } = useTransition();

  // Floating / pulse animations for HUD
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 8000, useNativeDriver: true })
    ).start();
  }, [floatAnim, pulseAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useFocusEffect(
    useCallback(() => {
      playTrack('Beginning Map');
    }, [playTrack])
  );

  // --- AVATAR FACING DIRECTION (flip based on horizontal movement) ---
  const lastFacingDirection = useSharedValue(1); // Default scale
  const facingScaleX = useDerivedValue(() => {
    if (velocityX.value > 0) {
      lastFacingDirection.value = -1;
      return -1;
    }
    if (velocityX.value < 0) {
      lastFacingDirection.value = 1;
      return 1;
    }
    return lastFacingDirection.value;
  });
  const avatarFlipStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: facingScaleX.value }],
  }));

  // Pet leash system - uses velocity to determine trailing position
  const petOffsetX = useSharedValue(80); // Start 80px to the right, well clear of joystick
  const petScaleX = useSharedValue(1);
  const petIsWalking = useSharedValue(false);

  // Smooth trailing logic based on player movement
  useAnimatedReaction(
    () => ({ vx: velocityX.value, vy: velocityY.value, active: isJoystickActive }),
    (state, prevState) => {
      // Update walking state
      petIsWalking.value = state.active;

      if (!state.active) {
        // When stopped, pet stays at current position (no change needed)
        return;
      }

      // Calculate target position based on movement direction
      // Pet should trail opposite to movement direction
      const LEASH_DISTANCE = 80; // Keep pet well clear of joystick (220px wide)
      let targetX = 0;
      
      if (state.vx > 0.1) {
        // Moving right - pet trails to the left
        targetX = -LEASH_DISTANCE;
        petScaleX.value = -1; // Face right (flip base art)
      } else if (state.vx < -0.1) {
        // Moving left - pet trails to the right  
        targetX = LEASH_DISTANCE;
        petScaleX.value = 1; // Face left (no flip)
      } else {
        // Vertical movement only - keep current side but face appropriate direction
        targetX = petOffsetX.value > 0 ? LEASH_DISTANCE : -LEASH_DISTANCE;
      }

      // Smoothly interpolate to target position (LERP)
      petOffsetX.value += (targetX - petOffsetX.value) * 0.1;
    }
  );

  const petAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: width / 2 - TILE_SIZE / 2,
    top: height / 2 - TILE_SIZE / 2 - 10,
    transform: [
      { translateX: petOffsetX.value },
      { scaleX: petScaleX.value }
    ],
    zIndex: 101,
  }));

  // Stable avatar component - only re-renders when cosmetics actually change
  const [avatarKey, setAvatarKey] = useState(0);
  const prevEquippedRef = useRef<string>('');
  
  // Detect real cosmetics changes (equip/unequip) vs movement updates
  useEffect(() => {
    // Create a signature of currently equipped items
    const equippedIds = user?.cosmetics
      ?.filter((c: any) => c.equipped)
      .map((c: any) => c.id)
      .sort() || [];
    const equippedSignature = equippedIds.join(',');
    
    if (equippedSignature !== prevEquippedRef.current) {
      prevEquippedRef.current = equippedSignature;
      setAvatarKey(k => k + 1);
    }
  }, [user?.cosmetics]);

  // Build avatar data from user, but wrapped in useMemo to prevent object recreation
  const avatarData = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      cosmetics: user.cosmetics,
      gender: user.gender,
      base_body_url: user.base_body_url,
      base_body_silhouette_url: user.base_body_silhouette_url,
      base_body_tint_hex: user.base_body_tint_hex,
      avatar_url: user.avatar_url,
    };
    // Only recreate when avatarKey changes (which happens when equipped items change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarKey]);

  // Stable avatar component
  const StableAvatar = useMemo(() => {
    if (!avatarData) return null;
    return (
      <View style={styles.playerAvatar}>
        <Reanimated.View style={avatarFlipStyle}>
          {/* Key ensures component is only recreated when cosmetics change */}
          <LayeredAvatar 
            key={avatarKey}
            user={avatarData as any} 
            size={72} 
            isMoving={false} 
          />
        </Reanimated.View>
      </View>
    );
  }, [avatarData, avatarFlipStyle, avatarKey]);

  // Exploration engine: tiles, nodes, encounters, auto-travel
  const {
    onTileEnter,
    refreshVision,
    visionGrid,
    nodesInVision,
    fastTravel,
    bankSteps,
    autoTravelReport,
    setAutoTravelReport,
    checkpointAlert,
    setCheckpointAlert,
    loading: movingOnMap,
  } = useExploration(setEncounter, setInteractionVisible, setActiveRaid, setRaidModalVisible, activeMapId);

  const handleCloseInteraction = () => {
    setActiveInteraction(null);
    setCheckpointAlert(null);
    setEncounter(null);
    setInteractionVisible(false);
  };

  const { pendingSteps, setPendingSteps } = useStepTracker();
  const { step } = useTutorial();

  const [loadingMap, setLoadingMap] = useState(true);
  const [showWalkabilityOverlay, setShowWalkabilityOverlay] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [allShopItems, setAllShopItems] = useState<any[]>([]);

  // Fetch shop items for hand grip rendering on avatars
  useEffect(() => {
    const fetchShopItems = async () => {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*');
      if (!error && data) {
        setAllShopItems(data);
      }
    };
    fetchShopItems();
  }, []);

  // Joystick movement now handled via shared values
  // We no longer need handleJoystickMove or moveRef

  const loadData = async () => {
    setLoadingMap(true);
    setMapError(null);
    try {
      const [mapRes, settingsRes] = await Promise.all([
        supabase.from('maps').select('id').eq('is_active', true).single(),
        supabase.from('world_map_settings').select('*').eq('id', 1).single()
      ]);

      if (mapRes.data) {
        setActiveMapId(mapRes.data.id);
      }
      if (settingsRes.data) {
        setMapSettings(settingsRes.data);
      }
      
      if (user) {
        await refreshVision(user.world_x || 0, user.world_y || 0, true);
      }
    } catch (err) {
      console.error("Error loading world data:", err);
      setMapError("Failed to load world data. Check connection.");
    } finally {
      setLoadingMap(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]); // Only re-run if user ID changes (login/logout)

  // 🎮 PARTY PRESENCE - Subscribe to party members' locations
  useEffect(() => {
    if (!user?.current_party_id || !user?.id) return;

    const channel = supabase.channel(`party-presence:${user.current_party_id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const membersMap = new Map<string, any>();
        
        // Process all presence states
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== user.id && presences && presences.length > 0) {
            // Get the latest presence data for this member
            const latest = presences[presences.length - 1] as any;
            if (latest.world_x !== undefined && latest.world_y !== undefined) {
              membersMap.set(key, {
                id: key,
                hunter_name: latest.hunter_name || 'Unknown',
                world_x: latest.world_x,
                world_y: latest.world_y,
                avatar_url: latest.avatar_url,
                base_body_url: latest.base_body_url,
                base_body_silhouette_url: latest.base_body_silhouette_url,
                base_body_tint_hex: latest.base_body_tint_hex,
                gender: latest.gender,
                cosmetics: latest.cosmetics,
                lastSeen: Date.now(),
              });
            }
          }
        });
        
        setPartyMembersOnline(membersMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Party member joined:', key, newPresences);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('Party member left:', key);
        setPartyMembersOnline(prev => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Broadcast current position with all avatar data needed
          await channel.track({
            id: user.id,
            hunter_name: user.hunter_name,
            world_x: user.world_x || 0,
            world_y: user.world_y || 0,
            avatar_url: user.avatar_url,
            base_body_url: user.base_body_url,
            base_body_silhouette_url: user.base_body_silhouette_url,
            base_body_tint_hex: user.base_body_tint_hex,
            gender: user.gender,
            cosmetics: user.cosmetics,
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [user?.current_party_id, user?.id]);

  // 🎮 PARTY PRESENCE - Broadcast position updates when moving
  useEffect(() => {
    if (!presenceChannelRef.current || !user?.current_party_id) return;
    
    presenceChannelRef.current.track({
      id: user.id,
      hunter_name: user.hunter_name,
      world_x: user.world_x || 0,
      world_y: user.world_y || 0,
      avatar_url: user.avatar_url,
      base_body_url: user.base_body_url,
      base_body_silhouette_url: user.base_body_silhouette_url,
      base_body_tint_hex: user.base_body_tint_hex,
      gender: user.gender,
      cosmetics: user.cosmetics,
    });
  }, [user?.world_x, user?.world_y, user?.current_party_id]);

  useEffect(() => {
    if (user && user.level > previousLevel) {
      setLevelUpVisible(true);
      setPreviousLevel(user.level);
    }
  }, [user?.level]);

  useEffect(() => {
    // 1. Fetch History for Catch-up
    const fetchNewsHistory = async () => {
      const { data } = await supabase
        .from('global_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      if (data) setSystemNews(data);
    };
    fetchNewsHistory();

    // 2. Subscribe to Live Discovery Broadcasts
    const channel = supabase
      .channel('world-news')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'global_notifications' },
        (payload) => {
          setSystemNews(prev => [payload.new, ...prev].slice(0, 3));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // "System Alert" haptic
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleTravelSuccess = (newX: number, newY: number, cost: number) => {
    if (!user) return;
    const newSteps = (user.steps_banked || 0) - cost;

    setUser({
      ...user,
      world_x: newX,
      world_y: newY,
      steps_banked: newSteps
    });

    refreshVision(newX, newY, true);
  };

  const handleSystemChoice = async (choice: 'AUTO' | 'MANUAL') => {
    const steps = pendingSteps;
    setPendingSteps(0); // Close modal immediately
    if (choice === 'AUTO') await fastTravel(steps);
    else await bankSteps(steps);
  };

  const startTestBattle = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Fetch a random encounter from encounter_pool
      const { data, error } = await supabase
        .from('encounter_pool')
        .select('id')
        .limit(10); // Get a few and pick random or just use first

      if (error) throw error;
      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        const randomId = data[randomIndex].id;

        // Take snapshot and start global transition
        const snapshot = await makeImageFromView(viewRef);
        if (snapshot) {
          const partyPreview = [];
          if (user) partyPreview.push({ type: 'player' as const, user, allShopItems });
          if (activePet?.pet_details) partyPreview.push({ type: 'pet' as const, petDetails: activePet.pet_details });
          startTransition(
            snapshot,
            () => navigation.navigate('Battle', { encounterId: randomId }),
            partyPreview.length > 0 ? partyPreview : undefined
          );
        } else {
          navigation.navigate('Battle', { encounterId: randomId });
        }
      } else {
        Alert.alert('System Error', 'No encounters found in pool.');
      }
    } catch (err) {
      console.error('Error starting test battle:', err);
      Alert.alert('System Error', 'Failed to initialize test combat.');
    }
  };

  const handleNewsTap = (news: any) => {
    // Parse the '[X, Y]' string we saved in Phase 1
    const coords = news.coordinates.replace(/[\[\]]/g, '').split(', ');
    setNavigationTarget({ x: parseInt(coords[0]), y: parseInt(coords[1]) });

    // Auto-hide the arrow after 10 seconds so it doesn't clutter the UI
    setTimeout(() => setNavigationTarget(null), 10000);
  };

  // Temple / Advancement: current tile and eligibility (matches TempleScreen logic)
  const currentTile = visionGrid.find((t) => t.x === user?.world_x && t.y === user?.world_y);
  const isOnTempleTile = currentTile?.node?.type === 'TEMPLE';
  const currentTier = user?.rank_tier ?? 0;
  const nextMilestone = (currentTier + 1) * 30;
  const isAdvancementLocked = Boolean(
    user?.next_advancement_attempt && new Date(user.next_advancement_attempt).getTime() > Date.now()
  );
  const canAttemptAdvancement = (user?.level || 0) >= nextMilestone && !isAdvancementLocked;

  const renderSystemNews = () => {
    if (systemNews.length === 0) return null;

    return (
      <View style={styles.newsContainer}>
        {systemNews.map((news) => (
          <TouchableOpacity key={news.id} onPress={() => handleNewsTap(news)}>
            <MotiView
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              style={styles.newsItem}
            >
              <Text style={styles.newsText}>
                <Text style={{ color: '#22d3ee' }}>[SYSTEM]</Text> {news.message} {news.coordinates}
              </Text>
            </MotiView>
          </TouchableOpacity>
        ))}
        {/* Clear Button */}
        <TouchableOpacity style={styles.clearNewsBtn} onPress={() => setSystemNews([])}>
          <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View ref={viewRef} style={StyleSheet.absoluteFill} collapsable={false}>
        {loadingMap && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#22d3ee" />
            <Text style={styles.mapLoadingText}>LOADING WORLD DATA...</Text>
          </View>
        )}

        {mapError && (
          <View style={styles.mapLoadingOverlay}>
            <Ionicons name="cloud-offline" size={48} color="#ef4444" />
            <Text style={[styles.mapLoadingText, { color: '#ef4444' }]}>{mapError}</Text>
            <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. THE MAP LAYER (Moving Background or Fallback Color) */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1c0e' }]} />

        {/* 2. THE MAP: Powered by Skia with Velocity Engine */}
        <SkiaWorldMap
          visionGrid={visionGrid}
          mapSettings={mapSettings}
          user={user}
          activePet={activePet}
          tileSize={TILE_SIZE}
          showWalkabilityOverlay={showWalkabilityOverlay}
          velocityX={velocityX}
          velocityY={velocityY}
          isSprinting={isSprinting}
          onTileEnter={onTileEnter}
          overlayChildren={
            user && (
              <View 
                style={[
                  styles.playerContainer, 
                  { 
                    position: 'absolute', 
                    // Fixed center position - the map moves under the player
                    left: width / 2 - TILE_SIZE / 2,
                    top: height / 2 - TILE_SIZE / 2,
                    width: TILE_SIZE, 
                    height: TILE_SIZE,
                  }
                ]}
                pointerEvents="box-none"
              >
                {StableAvatar}
              </View>
            )
          }
          petOverlay={
            activePet?.pet_details?.metadata?.visuals?.walking_spritesheet && (
              <Animated.View
                style={{
                  position: 'absolute',
                  left: width / 2 - TILE_SIZE / 2,
                  top: height / 2 - TILE_SIZE / 2 - 10,
                  zIndex: 101,
                  width: 100,
                  height: 100,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [
                    { translateX: petOffsetX.value },
                    { scaleX: petScaleX.value }
                  ]
                }}
                pointerEvents="box-none"
              >
                <PetSprite
                  imageUrl={activePet.pet_details.metadata.visuals.walking_spritesheet.url}
                  action={petIsWalking.value ? 'walk' : 'idle'}
                  idleIndex={activePet.pet_details.metadata.visuals.walking_spritesheet.idle_frame ?? 0}
                  totalFrames={activePet.pet_details.metadata.visuals.walking_spritesheet.frame_count ?? 1}
                  totalTimeMs={activePet.pet_details.metadata.visuals.walking_spritesheet.duration_ms ?? 1000}
                  frameWidth={activePet.pet_details.metadata.visuals.walking_spritesheet.frame_width ?? 64}
                  frameHeight={activePet.pet_details.metadata.visuals.walking_spritesheet.frame_height ?? 64}
                  scale={0.15 * (TILE_SIZE / 48)}
                  flipX={false} // Direction is now handled by scaleX
                />
              </Animated.View>
            )
          }
        >
          {(nodesInVision || []).map((node) => {
            const nodeLeft = node.x * TILE_SIZE;
            const nodeTop = node.y * TILE_SIZE;

            return (
              <View 
                key={`node-${node.id}`}
                style={[
                  styles.tile, 
                  { 
                    width: TILE_SIZE, 
                    height: TILE_SIZE, 
                    position: 'absolute',
                    left: nodeLeft,
                    top: nodeTop,
                    zIndex: (1000 - Math.floor(node.y))
                  }
                ]}
              >
                <TouchableOpacity 
                  onPress={() => setSelectedNode(node)}
                  activeOpacity={0.7}
                >
              <View style={styles.nodeContainer}>
                <View style={styles.nodeIconWrapper}>
                  <Image 
                    source={mapNodeIcon(node.icon_url, node.type)} 
                    style={styles.nodeIcon} 
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.nodeLabel}>{node.name}</Text>
              </View>
                </TouchableOpacity>
              </View>
            );
          })}

          {/* PARTY MEMBERS */}
          {user?.current_party_id && partyMembersOnline.size > 0 && Array.from(partyMembersOnline.values()).map((member) => {
            const memberLeft = member.world_x * TILE_SIZE;
            const memberTop = member.world_y * TILE_SIZE;
            
            return (
              <MotiView
                key={`party-${member.id}`}
                style={[styles.partyMemberContainer, { position: 'absolute', left: memberLeft, top: memberTop, zIndex: 1000 - member.world_y }]}
                animate={{ left: memberLeft, top: memberTop }}
                transition={{ type: 'timing', duration: 250 }}
              >
                <View style={styles.partyMemberAvatar}>
                  <LayeredAvatar 
                    user={member} 
                    size={56} 
                    allShopItems={allShopItems}
                  />
                </View>
                <View style={styles.partyMemberLabel}>
                  <View style={styles.partyMemberIndicator} />
                  <Text style={styles.partyMemberName}>{member.hunter_name}</Text>
                </View>
              </MotiView>
            );
          })}
        </SkiaWorldMap>

        {/* 4. HUD & CONTROLS */}

        <Animated.View style={[styles.hudTop, { transform: [{ translateY: floatAnim }] }]}>
          <HolographicGlass style={styles.topPill} contentStyle={styles.topPillContent} hideGlow>
            <FootprintsIcon />
            <GlowingStepCounter steps={user?.steps_banked || 0} />
          </HolographicGlass>
          {/* Advancement trial available notification */}
          {canAttemptAdvancement && (
            <TouchableOpacity
              style={styles.advancementBanner}
              onPress={() => navigation.navigate('Temple')}
              activeOpacity={0.9}
            >
              <Ionicons name="flame" size={18} color="#eab308" />
              <Text style={styles.advancementBannerText}>Advancement trial available — Tap to enter Temple</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Floating Compass Button */}
        <TouchableOpacity
          style={styles.floatingMapBtn}
          onPress={() => setTravelMenuVisible(true)}
        >
          <Ionicons name="compass" size={24} color="#22d3ee" />
          <Text style={styles.mapBtnText}>WORLD</Text>
        </TouchableOpacity>

        {/* TEST BATTLE BUTTON */}
        <TouchableOpacity
          style={[styles.floatingMapBtn, { top: 120, borderColor: '#ef4444' }]}
          onPress={startTestBattle}
        >
          <Ionicons name="skull" size={24} color="#ef4444" />
          <Text style={[styles.mapBtnText, { color: '#ef4444' }]}>BATTLE</Text>
        </TouchableOpacity>

        {/* Enter Temple — only when standing on a Temple tile */}
        {isOnTempleTile && (
          <TouchableOpacity
            style={[styles.floatingMapBtn, { top: 300, borderColor: '#eab308' }]}
            onPress={() => navigation.navigate('Temple')}
          >
            <Ionicons name="flame" size={24} color="#eab308" />
            <Text style={[styles.mapBtnText, { color: '#eab308' }]}>ENTER TEMPLE</Text>
          </TouchableOpacity>
        )}

        {/* Virtual Joystick — feeds SharedValues directly to the Map Engine */}
        <View style={styles.joystickLayer} pointerEvents="box-none">
          <VirtualJoystick 
            velocityX={velocityX} 
            velocityY={velocityY} 
            isSprinting={isSprinting} 
            onMoveStateChange={setIsJoystickActive}
          />
        </View>

        {/* --- MODALS --- */}

        {/* TRAVEL MENU MODAL */}
        <TravelMenu
          visible={travelMenuVisible}
          onClose={() => setTravelMenuVisible(false)}
          user={user}
          onTravelSuccess={handleTravelSuccess}
        />

        {/* Welcome Back / Offline Steps */}
        <Modal visible={pendingSteps > 0 && step !== 'NAV_MAP'} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <HolographicGlass style={styles.modalGlass}>
                <Animated.View style={{ transform: [{ translateY: floatAnim }], alignItems: 'center', marginBottom: 16 }}>
                  <WalkingIcon size={56} />
                </Animated.View>
                <Text style={styles.modalTitle}>ENERGY COLLECTED</Text>
            
            <View style={styles.stepsRow}>
              {/* Left Equalizer SVG */}
              <Animated.View style={{ opacity: pulseAnim }}>
                <Svg width="32" height="24" viewBox="0 0 32 24" fill="#00E5FF">
                  <Rect x="2" y="8" width="4" height="8" rx="2" />
                  <Rect x="10" y="4" width="4" height="16" rx="2" />
                  <Rect x="18" y="2" width="4" height="20" rx="2" />
                  <Rect x="26" y="6" width="4" height="12" rx="2" />
                </Svg>
              </Animated.View>
              
              <Text style={styles.stepsNumber}>
                {pendingSteps} <Text style={styles.stepsLabel}>STEPS</Text>
              </Text>
              
              {/* Right Equalizer SVG */}
              <Animated.View style={{ opacity: pulseAnim }}>
                <Svg width="32" height="24" viewBox="0 0 32 24" fill="#00E5FF">
                  <Rect x="2" y="6" width="4" height="12" rx="2" />
                  <Rect x="10" y="2" width="4" height="20" rx="2" />
                  <Rect x="18" y="4" width="4" height="16" rx="2" />
                  <Rect x="26" y="8" width="4" height="8" rx="2" />
                </Svg>
              </Animated.View>
            </View>
            {/* Decorative Progress Bar */}
            <View style={styles.progressRow}>
              {[...Array(10)].map((_, i) => (
                <Animated.View 
                  key={i} 
                  style={[
                    styles.progressDash, 
                    { backgroundColor: i < 7 ? '#00E5FF' : 'rgba(0, 229, 255, 0.2)' },
                    i < 7 && { opacity: pulseAnim },
                    i < 7 && styles.activeDashGlow
                  ]} 
                />
              ))}
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.actionButton, styles.redBorder]} onPress={() => handleSystemChoice('AUTO')} activeOpacity={0.7}>
                <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 8 }}>
                  <TargetCrosshairIcon />
                </Animated.View><Text style={styles.buttonTitleRed}>AUTO-HUNT</Text><Text style={styles.buttonSubtextRed} numberOfLines={1} adjustsFontSizeToFit>Automatic Encounter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.cyanBorder]} onPress={() => handleSystemChoice('MANUAL')} activeOpacity={0.7}>
                <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 8 }}>
                  <CompassIcon />
                </Animated.View><Text style={styles.buttonTitleCyan}>MANUAL</Text><Text style={styles.buttonSubtextCyan} numberOfLines={1} adjustsFontSizeToFit>Explore Map</Text>
              </TouchableOpacity>
            </View>
          </HolographicGlass>
        </View>
          </View>
        </Modal>

        {/* Checkpoint Found */}
        <InteractionModal
          visible={!!activeInteraction || !!selectedNode}
          onClose={() => {
            handleCloseInteraction();
            setSelectedNode(null);
          }}
          activeInteraction={activeInteraction || selectedNode}
        />

        <LevelUpModal
          visible={levelUpVisible}
          user={user}
          previousLevel={previousLevel}
          onClose={() => setLevelUpVisible(false)}
        />

        {activeRaid && user && (
          <RaidCombatModal
            visible={raidModalVisible}
            raidId={activeRaid.id}
            userId={user.id}
            bossImage={activeRaid.boss_image}
            bossName={activeRaid.boss_name}
            maxHp={activeRaid.max_hp}
            onClose={() => setRaidModalVisible(false)}
          />
        )}
        {renderSystemNews()}
        {navigationTarget && (
          <MotiView
            from={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.compassContainer}
          >
            <Ionicons name="arrow-up" size={24} color="#facc15" style={{ transform: [{ rotate: `${Math.atan2(navigationTarget.x - (user?.world_x || 0), navigationTarget.y - (user?.world_y || 0)) * 180 / Math.PI}deg` }] }} />
            <Text style={styles.compassText}>
              🎯 BOSS DETECTED: {navigationTarget.x}, {navigationTarget.y}
            </Text>
          </MotiView>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1c14' }, // Dark greenish black background for map edges

  // MAP LAYERS
  mapLayer: { position: 'absolute', width: width, height: height, zIndex: 0 },
  gridLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  tile: { position: 'absolute' },

  playerContainer: {
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },

  playerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Restore hidden to keep the circle shape
  },

  petAvatarOnMap: {
    position: 'absolute',
    right: -25, // Moved further right to completely clear the player circle
    bottom: -20, // Moved further down
    zIndex: 12,
  },

  // 🎮 PARTY MEMBERS ON MAP
  partyLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5, // Between grid (1) and player (10)
  },
  partyMemberContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  partyMemberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#22c55e', // Green border for party members
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  partyMemberLabel: {
    position: 'absolute',
    bottom: -20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  partyMemberName: {
    color: '#22c55e',
    fontSize: 9,
    fontWeight: 'bold',
  },
  partyMemberIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },

  nodeContainer: {
    alignItems: 'center',
    zIndex: 6,
  },
  nodeIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  nodeIcon: {
    width: 42,
    height: 42,
  },
  nodeLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },

  hudTop: { position: 'absolute', top: 60, width: '100%', alignItems: 'center', zIndex: 20 },
  staminaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.05)', // Even more translucent
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 30, // Reverted to rounded
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.6)',
    overflow: 'hidden',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
  staminaText: {
    color: '#22d3ee',
    fontWeight: '900',
    fontSize: 18,
    textShadowColor: 'rgba(34, 211, 238, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    letterSpacing: 1,
  },
  advancementBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'rgba(234, 179, 8, 0.2)', borderRadius: 10, borderWidth: 1, borderColor: '#eab308', maxWidth: '90%' },
  advancementBannerText: { color: '#eab308', fontWeight: 'bold', fontSize: 12 },

  floatingMapBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22d3ee',
    zIndex: 40,
    shadowColor: '#22d3ee',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  mapBtnText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 1,
  },

  joystickLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 30 },

  // MODALS
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(5, 10, 20, 0.15)', // Highly translucent to see map
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalCard: { width: '80%', backgroundColor: '#0f172a', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },

  travelMenuCard: {
    width: '90%',
    height: '70%',
    backgroundColor: '#020617',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
    padding: 20,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  travelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.2)',
    paddingBottom: 10,
  },
  travelTitle: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  locationList: {
    flex: 1,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  locIconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  locCoords: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'Exo2-Regular',
  },
  travelAction: {
    alignItems: 'flex-end',
  },
  travelBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  travelCost: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 8,
    fontWeight: 'bold',
  },
  travelBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  currentBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  currentText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noLocationsText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },

  glassWrapper: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(0, 229, 255, 0.15)',
    borderBottomColor: 'rgba(0, 229, 255, 0.3)',
    backgroundColor: 'transparent', // NO solid colors blocking the blur
  },
  glowShadow: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#00E5FF',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  gradientSurface: {
    padding: 24,
    alignItems: 'center',
  },
  topPill: {
    borderRadius: 30,
    alignSelf: 'center', // Fix for stretching
    backgroundColor: 'transparent',
  },
  topPillContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50, // Set a fixed height
    minWidth: 80,
  },
  topPillTextWrapper: {
    marginLeft: -6, // originally 10 - 16 padding = -6
    marginRight: -16,
    marginVertical: -12,
  },
  topPillText: {
    color: '#00E5FF',
    fontSize: 20,
    fontWeight: 'bold',
    // Generous padding prevents the Android text shadow "rectangle" clipping bug
    paddingHorizontal: 16,
    paddingVertical: 12,
    textShadowColor: 'rgba(0, 229, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  modalGlass: {
    borderRadius: 32,
    width: '100%',
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    opacity: 0.8,
  },
  modalTitle: {
    color: 'rgba(0, 229, 255, 0.8)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 20,
  },
  stepsNumber: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '900',
    marginHorizontal: 15,
    textShadowColor: 'rgba(0, 229, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  stepsLabel: {
    color: '#00E5FF',
    fontSize: 24,
  },
  progressRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 30,
  },
  progressDash: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  activeDashGlow: {
    shadowColor: '#00E5FF',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // highly see-through
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redBorder: {
    borderColor: 'rgba(255, 68, 68, 0.5)',
    borderWidth: 1,
  },
  cyanBorder: {
    borderColor: 'rgba(0, 229, 255, 0.5)',
    borderWidth: 1,
  },
  buttonTitleRed: { color: '#ff4444', fontWeight: 'bold', marginTop: 8 },
  buttonSubtextRed: { color: 'rgba(255, 68, 68, 0.6)', fontSize: 10, marginTop: 4 },
  buttonTitleCyan: { color: '#00E5FF', fontWeight: 'bold', marginTop: 8 },
  buttonSubtextCyan: { color: 'rgba(0, 229, 255, 0.6)', fontSize: 10, marginTop: 4 },
  closeBtn: { marginTop: 20, backgroundColor: '#22d3ee', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 8 },
  newsContainer: {
    position: 'absolute',
    top: 140, // Moved down from 120
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 10,
    zIndex: 50, // Ensure it sits above map but below modals
  },
  clearNewsBtn: {
    position: 'absolute',
    right: 5,
    top: 5,
    zIndex: 10,
  },
  newsItem: {
    marginBottom: 5,
  },
  newsText: {
    color: '#fff',
    fontSize: 12,
  },
  compassContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compassText: {
    color: '#facc15',
    marginLeft: 10,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  mapLoadingText: {
    color: '#22d3ee',
    marginTop: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  decorBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  decorBar: {
    width: 4,
    backgroundColor: '#00E5FF',
    borderRadius: 2,
    justifyContent: 'space-between',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
});

export default WorldMapScreen;
