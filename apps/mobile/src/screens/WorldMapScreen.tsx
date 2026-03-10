import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Reanimated, {
  useAnimatedRef,
  useSharedValue,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { makeImageFromView } from '@shopify/react-native-skia';

import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useExploration } from '@/hooks/useExploration';
import { useStepTracker } from '@/hooks/useStepTracker';
import { useTutorial } from '@/context/TutorialContext';
import { supabase } from '@/lib/supabase';
import { TravelMenu } from '@/components/modals/TravelMenu';
import { InteractionModal } from '@/components/modals/InteractionModal';
import { LevelUpModal } from '@/components/modals/LevelUpModal';
import { RaidCombatModal } from '@/components/modals/RaidCombatModal';
import { usePets } from '@/hooks/usePets';
import { useActivePet } from '@/contexts/ActivePetContext';
import { useTransition } from '@/context/TransitionContext';

import { SkiaWorldMap } from '../components/world-map/SkiaWorldMap';
import { DPad } from '../components/world-map/DPad';
import { MapHUD } from '@/components/world-map/MapHUD';
import { OfflineStepsModal } from '@/components/world-map/OfflineStepsModal';
import { MapNewsOverlay } from '@/components/world-map/MapNewsOverlay';
import { MapLoadingOverlay } from '@/components/world-map/MapLoadingOverlay';
import { NavigationTargetArrow } from '@/components/world-map/NavigationTargetArrow';
import { WorldNodesLayer } from '@/components/world-map/WorldNodesLayer';
import { PartyMembersLayer } from '@/components/world-map/PartyMembersLayer';

import { usePartyPresence } from '@/hooks/usePartyPresence';
import { useMapUIAnimations } from '@/hooks/useMapUIAnimations';
import { useMapData } from '@/hooks/useMapData';
import { useWalkingSound } from '@/hooks/useWalkingSound';
import { useSystemNews } from '@/hooks/useSystemNews';
import { useMapCharacter } from '@/hooks/useMapCharacter';

import { worldMapStyles } from './WorldMapScreen.styles';

const TILE_SIZE = 48;

export const WorldMapScreen = () => {
  const navigation = useNavigation<any>();
  const { user, setUser, refreshProfile } = useAuth();
  const { playTrack } = useAudio();
  const { pets } = usePets();
  const { activePetId } = useActivePet();
  const activePet = pets.find((p) => p.id === activePetId) ?? (pets.length > 0 ? pets[0] : null);

  // Source of truth: which direction is currently being held
  const activeDirection = useSharedValue<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>(null);

  const isRunning = useSharedValue(false);
  const isMoving = useSharedValue(false);
  const holdRunTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Numeric direction used by avatar / pet logic (1–4, 0 = idle)
  const pendingDir = useSharedValue(0);

  // Camera position — snapped to exact tile multiples. Hoisted here to sync with Avatar/Pet.
  const mapLeft = useSharedValue(-(user?.world_x || 0) * TILE_SIZE - (TILE_SIZE / 2));
  const mapTop = useSharedValue(-(user?.world_y || 0) * TILE_SIZE - (TILE_SIZE / 2));

  useAnimatedReaction(
    () => activeDirection.value,
    (dir) => {
      let next = 0;
      if (dir === 'UP') next = 1;
      else if (dir === 'DOWN') next = 2;
      else if (dir === 'LEFT') next = 3;
      else if (dir === 'RIGHT') next = 4;
      if (pendingDir.value !== next) pendingDir.value = next;
    }
  );

  // Hold for 2 seconds to enter run mode (no JS D-Pad callbacks; we observe activeDirection)
  const startHoldRunTimer = useCallback(() => {
    if (holdRunTimerRef.current) clearTimeout(holdRunTimerRef.current);
    holdRunTimerRef.current = setTimeout(() => {
      holdRunTimerRef.current = null;
      isRunning.value = true;
    }, 2000);
  }, [isRunning]);

  const clearHoldRunTimer = useCallback(() => {
    if (holdRunTimerRef.current) {
      clearTimeout(holdRunTimerRef.current);
      holdRunTimerRef.current = null;
    }
    isRunning.value = false;
  }, [isRunning]);

  useAnimatedReaction(
    () => activeDirection.value,
    (dir, prevDir) => {
      if (dir && !prevDir) runOnJS(startHoldRunTimer)();
      if (!dir && prevDir) runOnJS(clearHoldRunTimer)();
    }
  );

  useEffect(() => {
    return () => {
      if (holdRunTimerRef.current) clearTimeout(holdRunTimerRef.current);
    };
  }, []);

  const [travelMenuVisible, setTravelMenuVisible] = useState(false);
  const [encounter, setEncounter] = useState<any | null>(null);
  const [interactionVisible, setInteractionVisible] = useState(false);
  const [activeInteraction, setActiveInteraction] = useState<any | null>(null);
  const [previousLevel, setPreviousLevel] = useState(user?.level || 1);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [raidModalVisible, setRaidModalVisible] = useState(false);
  const [activeRaid, setActiveRaid] = useState<any | null>(null);
  const [showWalkabilityOverlay, setShowWalkabilityOverlay] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const {
    activeMapId,
    mapSettings,
    loadingMap,
    mapError,
    allShopItems,
    loadData,
  } = useMapData(user?.id);

  const {
    onTileEnter,
    refreshVision,
    visionGrid,
    nodesInVision,
    fastTravel,
    bankSteps,
    setCheckpointAlert,
    loading: movingOnMap,
    bankedSteps,
  } = useExploration(
    setEncounter,
    setInteractionVisible,
    setActiveRaid,
    setRaidModalVisible,
    activeMapId
  );

  useEffect(() => {
    if (activeMapId && user != null) {
      refreshVision(user.world_x ?? 0, user.world_y ?? 0, true);
    }
  }, [activeMapId, user?.id]);

  const { partyMembersOnline } = usePartyPresence();
  const viewRef = useAnimatedRef<View>();
  const { startTransition } = useTransition();
  const { floatAnim, pulseAnim, spin } = useMapUIAnimations();
  const { 
    playerBaseX, 
    playerBaseY, 
    facingScaleX, 
    petOffsetX, 
    petOffsetY, 
    petScaleX, 
    petZIndex, 
    avatarData 
  } = useMapCharacter(pendingDir, isMoving, user, activePet as any, mapLeft, mapTop);

  useWalkingSound(activeDirection);

  useEffect(() => {
    activeDirection.value = null;
  }, [activeDirection]);

  // Safety Reset: Force stop movement if app goes background/inactive
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        activeDirection.value = null;
        isMoving.value = false;
      }
    });
    return () => subscription.remove();
  }, [activeDirection, isMoving]);

  useFocusEffect(
    useCallback(() => {
      playTrack('Beginning Map');
      refreshProfile();
    }, [playTrack, refreshProfile])
  );

  const handleUnstuck = useCallback(async () => {
    if (!user) return;
    try {
      const safeX = 0;
      const safeY = 0;
      const now = new Date().toISOString();
      setUser({ ...user, world_x: safeX, world_y: safeY, last_sync_time: now });
      await supabase
        .from('profiles')
        .update({ world_x: safeX, world_y: safeY, last_sync_time: now })
        .eq('id', user.id);
      await refreshVision(safeX, safeY, true);
    } catch (e) {
      console.warn('[WorldMap] Unstuck failed:', e);
    }
  }, [user, setUser, refreshVision]);

  const handleCloseInteraction = useCallback(() => {
    setActiveInteraction(null);
    setCheckpointAlert(null);
    setEncounter(null);
    setInteractionVisible(false);
  }, [setCheckpointAlert]);

  const { pendingSteps, setPendingSteps } = useStepTracker();
  const { step } = useTutorial();
  const { systemNews, setSystemNews, navigationTarget, handleNewsTap } = useSystemNews();

  const handleTravelSuccess = useCallback(
    (newX: number, newY: number, cost: number) => {
      if (!user) return;
      setUser({
        ...user,
        world_x: newX,
        world_y: newY,
        steps_banked: (user.steps_banked || 0) - cost,
      });
      refreshVision(newX, newY, true);
    },
    [user, setUser, refreshVision]
  );

  const handleSystemChoice = useCallback(
    async (choice: 'AUTO' | 'MANUAL') => {
      const steps = pendingSteps;
      setPendingSteps(0);
      if (choice === 'AUTO') await fastTravel(steps);
      else await bankSteps(steps);
    },
    [pendingSteps, setPendingSteps, fastTravel, bankSteps]
  );

  const startTestBattle = useCallback(async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { data, error } = await supabase.from('encounter_pool').select('id').limit(10);
      if (error) throw error;
      if (data?.length) {
        const randomId = data[Math.floor(Math.random() * data.length)].id;
        const snapshot = await makeImageFromView(viewRef);
        const partyPreview = [];
        if (user) partyPreview.push({ type: 'player' as const, user, allShopItems });
        if (activePet?.pet_details) partyPreview.push({ type: 'pet' as const, petDetails: activePet.pet_details });
        if (snapshot) {
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
  }, [user, activePet, allShopItems, startTransition, navigation]);

  useEffect(() => {
    if (user && user.level > previousLevel) {
      setLevelUpVisible(true);
      setPreviousLevel(user.level);
    }
  }, [user?.level]);

  const partyMembers = user?.current_party_id ? Array.from(partyMembersOnline.values()) : [];

  return (
    <View style={worldMapStyles.container}>
      <Reanimated.View ref={viewRef} style={StyleSheet.absoluteFill} collapsable={false}>
        <MapLoadingOverlay loading={loadingMap} error={mapError} onRetry={loadData} />

        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1c0e' }]} />

        <SkiaWorldMap
          visionGrid={visionGrid}
          nodesInVision={nodesInVision}
          mapSettings={mapSettings}
          spawnX={user?.world_x ?? 0}
          spawnY={user?.world_y ?? 0}
          activePet={activePet}
          tileSize={TILE_SIZE}
          showWalkabilityOverlay={showWalkabilityOverlay}
          pendingDir={pendingDir}
          activeDirection={activeDirection}
          isRunning={isRunning}
          isMoving={isMoving}
          bankedSteps={bankedSteps}
          mapLeft={mapLeft}
          mapTop={mapTop}
          onTileEnter={onTileEnter}
          playerBaseX={playerBaseX}
          playerBaseY={playerBaseY}
          facingScaleX={facingScaleX}
          petOffsetX={petOffsetX}
          petOffsetY={petOffsetY}
          petScaleX={petScaleX}
          petZIndex={petZIndex}
          avatarData={avatarData}
          allShopItems={allShopItems}
        >
          <WorldNodesLayer
            nodes={nodesInVision ?? []}
            tileSize={TILE_SIZE}
            onSelectNode={setSelectedNode}
          />
          <PartyMembersLayer
            members={partyMembers}
            allShopItems={allShopItems}
            tileSize={TILE_SIZE}
          />
        </SkiaWorldMap>

        <MapHUD
          onPressTemple={() => navigation.navigate('Temple')}
          onPressWorld={() => setTravelMenuVisible(true)}
          onPressBattle={startTestBattle}
          floatAnim={floatAnim}
        />

        <View style={worldMapStyles.dpadLayer} pointerEvents="box-none">
          <DPad activeDirection={activeDirection} disabled={false} />
        </View>

        <TravelMenu
          visible={travelMenuVisible}
          onClose={() => setTravelMenuVisible(false)}
          user={user}
          onTravelSuccess={handleTravelSuccess}
          onUnstuck={handleUnstuck}
        />

        <OfflineStepsModal
          visible={pendingSteps > 0 && step !== 'NAV_MAP'}
          pendingSteps={pendingSteps}
          floatAnim={floatAnim}
          pulseAnim={pulseAnim}
          spin={spin}
          onAuto={() => handleSystemChoice('AUTO')}
          onManual={() => handleSystemChoice('MANUAL')}
        />

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

        <MapNewsOverlay
          systemNews={systemNews}
          onPressNews={handleNewsTap}
          onClear={() => setSystemNews([])}
        />

        <NavigationTargetArrow
          target={navigationTarget}
          playerX={user?.world_x ?? 0}
          playerY={user?.world_y ?? 0}
        />
      </Reanimated.View>
    </View>
  );
};

export default WorldMapScreen;
