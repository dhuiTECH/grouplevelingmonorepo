import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  StyleSheet,
  AppState,
  AppStateStatus,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Reanimated, {
  useAnimatedRef,
  useSharedValue,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";
import { useAuth } from "@/contexts/AuthContext";
import { useAudio } from "@/contexts/AudioContext";
import { useExploration } from "@/hooks/useExploration";
import { useStepTracker } from "@/hooks/useStepTracker";
import { useTutorial } from "@/context/TutorialContext";
import { supabase } from "@/lib/supabase";
import { TravelMenu } from "@/components/modals/TravelMenu";
import { InteractionModal } from "@/components/modals/InteractionModal";
import { LevelUpModal } from "@/components/modals/LevelUpModal";
import { RaidCombatModal } from "@/components/modals/RaidCombatModal";
import { usePets } from "@/hooks/usePets";
import { useActivePet } from "@/contexts/ActivePetContext";
import { useTransition } from "@/context/TransitionContext";

import { SkiaWorldMap } from "../components/world-map/SkiaWorldMap";
import { DPad } from "../components/world-map/DPad";
import { MapHUD } from "@/components/world-map/MapHUD";
import { OfflineStepsModal } from "@/components/world-map/OfflineStepsModal";
import { MapNewsOverlay } from "@/components/world-map/MapNewsOverlay";
import { MapLoadingOverlay } from "@/components/world-map/MapLoadingOverlay";
import { NavigationTargetArrow } from "@/components/world-map/NavigationTargetArrow";
import { WorldNodesLayer } from "@/components/world-map/WorldNodesLayer";
import { PartyMembersLayer } from "@/components/world-map/PartyMembersLayer";
import { prefetchDialogueNodeAssets } from "@/utils/prefetchDialogueNodeAssets";

import { usePartyPresence } from "@/hooks/usePartyPresence";
import { useMapUIAnimations } from "@/hooks/useMapUIAnimations";
import { useMapData } from "@/hooks/useMapData";
import { playWorldMapFootstep } from "@/utils/audio";
import { useSystemNews } from "@/hooks/useSystemNews";
import { useMapCharacter } from "@/hooks/useMapCharacter";
import { STEPS_PER_TILE } from "@/hooks/useLocalMovementBudget";
import { useJeffreyMapDemo, JEFFREY_MAP_DEMO_ENCOUNTER_ID } from "@/hooks/useJeffreyMapDemo";

import type { User } from "@/types/user";
import type { PartyPreviewItem } from "@/context/TransitionContext";
import { worldMapStyles } from "./WorldMapScreen.styles";

const TILE_SIZE = 48;
const DEBUG_WORLD_MAP_SYNC = __DEV__;

function logWorldMapScreenSync(
  message: string,
  payload?: Record<string, unknown>,
) {
  if (!DEBUG_WORLD_MAP_SYNC) return;
  if (payload) {
    console.log(`[WorldMapSync][WorldMapScreen] ${message}`, payload);
    return;
  }
  console.log(`[WorldMapSync][WorldMapScreen] ${message}`);
}

export const WorldMapScreen = () => {
  const navigation = useNavigation<any>();
  const { user, setUser, refreshProfile } = useAuth();
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const { playTrack, startBackgroundMusic } = useAudio();
  const { pets } = usePets();
  const { activePetId } = useActivePet();
  const activePet =
    pets.find((p) => p.id === activePetId) ??
    (pets.length > 0 ? pets[0] : null);

  const activePetRef = useRef(activePet);
  activePetRef.current = activePet;

  // Source of truth: which direction is currently being held
  const activeDirection = useSharedValue<
    "UP" | "DOWN" | "LEFT" | "RIGHT" | null
  >(null);

  const isRunning = useSharedValue(false);
  const isMoving = useSharedValue(false);
  const holdRunTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Numeric direction used by avatar / pet logic (1–4, 0 = idle)
  const pendingDir = useSharedValue(0);

  // Camera position — snapped to exact tile multiples. Hoisted here to sync with Avatar/Pet.
  const mapLeft = useSharedValue(
    -(user?.world_x || 0) * TILE_SIZE - TILE_SIZE / 2,
  );
  const mapTop = useSharedValue(
    -(user?.world_y || 0) * TILE_SIZE - TILE_SIZE / 2,
  );

  useAnimatedReaction(
    () => activeDirection.value,
    (dir) => {
      let next = 0;
      if (dir === "UP") next = 1;
      else if (dir === "DOWN") next = 2;
      else if (dir === "LEFT") next = 3;
      else if (dir === "RIGHT") next = 4;
      if (pendingDir.value !== next) pendingDir.value = next;
    },
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
    },
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

  const allShopItemsRef = useRef(allShopItems);
  allShopItemsRef.current = allShopItems;

  const viewRef = useAnimatedRef<View>();
  const { startTransition } = useTransition();

  const {
    explorationOptions: jeffreyExplorationOptions,
    ensureShopItemsForPreview,
    captureMapSnapshotForBattle,
  } = useJeffreyMapDemo({
    encounterId: JEFFREY_MAP_DEMO_ENCOUNTER_ID,
    mapId: activeMapId,
    userRef,
    activePetRef,
    allShopItemsRef,
    viewRef,
    navigation,
    startTransition,
  });

  const flushPendingVisionRef = useRef<() => void>(() => {});

  const {
    onTileEnter,
    refreshVision,
    flushPendingVision,
    visionGrid,
    nodesInVision,
    setCheckpointAlert,
    loading: movingOnMap,
    setAutoTravelReport,
    latestPos,
  } = useExploration(
    setEncounter,
    setInteractionVisible,
    setActiveRaid,
    setRaidModalVisible,
    activeMapId,
    undefined,
    jeffreyExplorationOptions,
  );

  flushPendingVisionRef.current = flushPendingVision;

  /** After the player pauses or the visible node set changes, warm dialogue backgrounds / portraits (not voice — see DialogueScene). */
  useEffect(() => {
    const t = setTimeout(() => {
      prefetchDialogueNodeAssets(nodesInVision ?? []);
    }, 400);
    return () => clearTimeout(t);
  }, [nodesInVision]);

  const stableVisionGridPrevRef = useRef<any[]>([]);
  const stableVisionGridRef = useRef<any[]>([]);
  const rawVisionGrid = visionGrid ?? [];
  const visionGridHasChanged =
    rawVisionGrid.length !== stableVisionGridPrevRef.current.length ||
    rawVisionGrid.some((cell, i) => {
      const prev = stableVisionGridPrevRef.current[i];
      return (
        !prev ||
        prev.x !== cell.x ||
        prev.y !== cell.y ||
        (prev.tiles?.length ?? 0) !== (cell.tiles?.length ?? 0) ||
        (prev.node?.id ?? null) !== (cell.node?.id ?? null) ||
        prev.isVisible !== cell.isVisible
      );
    });
  if (visionGridHasChanged) {
    stableVisionGridPrevRef.current = rawVisionGrid;
    stableVisionGridRef.current = rawVisionGrid;
  }

  /** Mirrors `profiles.steps_banked` for UI-thread movement gate (Skia). */
  const movementBudget = useSharedValue(user?.steps_banked ?? 0);
  useEffect(() => {
    if (user == null) return;
    movementBudget.value = user.steps_banked ?? 0;
  }, [user?.id, user?.steps_banked]);

  const spendStepsBank = useCallback(
    (cost: number) => {
      if (cost <= 0) return true;
      if (movementBudget.value < cost) return false;
      movementBudget.value -= cost;
      const prev = userRef.current;
      if (!prev) return false;
      const nextBank = Math.max(0, Math.floor(movementBudget.value));
      const next = { ...prev, steps_banked: nextBank };
      setUser(next);
      userRef.current = next;

      return true;
    },
    [movementBudget, setUser],
  );

  // Ref keeps saveSessionPosition stable; do not call setUser inside it (avoids focus blur/enter loops).
  // flushPendingVisionRef is set after useExploration (same flush as Jeffrey defer).
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  /** DB + vision flush only. React `user` coords are updated in useFocusEffect cleanup (real blur). */
  const saveSessionPosition = useCallback(() => {
    const pos = latestPos.current;
    const uid = userIdRef.current;
    const u = userRef.current;
    if (!pos || !uid || !u) {
      logWorldMapScreenSync("saveSessionPosition:skip", {
        hasPos: Boolean(pos),
        hasUserId: Boolean(uid),
        hasUser: Boolean(u),
      });
      return;
    }
    logWorldMapScreenSync("saveSessionPosition:start", {
      x: pos.x,
      y: pos.y,
      userId: uid,
    });
    const now = new Date().toISOString();
    supabase
      .from("profiles")
      .update({
        world_x: pos.x,
        world_y: pos.y,
        steps_banked: u.steps_banked ?? 0,
        last_sync_time: now,
      })
      .eq("id", uid)
      .then();
    flushPendingVisionRef.current();
    logWorldMapScreenSync("saveSessionPosition:end", {
      x: pos.x,
      y: pos.y,
    });
  }, []);

  useEffect(() => {
    if (activeMapId && user != null) {
      refreshVision(
        user.world_x ?? 0,
        user.world_y ?? 0,
        true,
        flushPendingVision,
      );
    }
  }, [activeMapId, user?.id, refreshVision, flushPendingVision]);

  const { partyMembersOnline } = usePartyPresence();
  const { floatAnim, pulseAnim, spin } = useMapUIAnimations();
  const {
    playerBaseX,
    playerBaseY,
    facingScaleX,
    petOffsetX,
    petOffsetY,
    petScaleX,
    petZIndex,
    avatarData,
  } = useMapCharacter(
    pendingDir,
    isMoving,
    user,
    activePet as any,
    mapLeft,
    mapTop,
  );

  /** One footstep per tile step while D-pad is held (`SkiaWorldMap` moveNext → invokeTileMoveStart). */
  const onTileMoveStartStable = useCallback((running: boolean) => {
    void playWorldMapFootstep(running);
  }, []);

  const lastTileBlockedAt = useRef(0);
  const onTileMoveBlockedStable = useCallback(
    (reason: "stamina" | "collision") => {
      const now = Date.now();
      if (now - lastTileBlockedAt.current < 180) return;
      lastTileBlockedAt.current = now;
      void Haptics.impactAsync(
        reason === "collision"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
    },
    [],
  );

  useEffect(() => {
    activeDirection.value = null;
  }, [activeDirection]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        logWorldMapScreenSync("appState:saveSessionPosition", { next });
        activeDirection.value = null;
        isMoving.value = false;
        saveSessionPosition();
      }
    });
    return () => sub.remove();
  }, [activeDirection, isMoving, saveSessionPosition]);

  useFocusEffect(
    useCallback(() => {
      logWorldMapScreenSync("focus:enter");
      void (async () => {
        await playTrack("Beginning Map");
        await startBackgroundMusic();
      })();
      refreshProfile();
      return () => {
        logWorldMapScreenSync("focus:blur:saveSessionPosition");
        saveSessionPosition();
      };
    }, [playTrack, startBackgroundMusic, refreshProfile, saveSessionPosition]),
  );

  const handleUnstuck = useCallback(async () => {
    if (!user) return;
    try {
      const safeX = 0;
      const safeY = 0;
      const now = new Date().toISOString();
      setUser({ ...user, world_x: safeX, world_y: safeY, last_sync_time: now });
      await supabase
        .from("profiles")
        .update({ world_x: safeX, world_y: safeY, last_sync_time: now })
        .eq("id", user.id);
      await refreshVision(safeX, safeY, true, flushPendingVision);
    } catch (e) {
      console.warn("[WorldMap] Unstuck failed:", e);
    }
  }, [user, setUser, refreshVision, flushPendingVision]);

  const handleCloseInteraction = useCallback(() => {
    setActiveInteraction(null);
    setCheckpointAlert(null);
    setEncounter(null);
    setInteractionVisible(false);
  }, [setCheckpointAlert]);

  const { pendingSteps, acknowledgeOfflineStepsPrompt } = useStepTracker();
  const { step } = useTutorial();
  const { systemNews, setSystemNews, navigationTarget, handleNewsTap } =
    useSystemNews();

  const handleTravelSuccess = useCallback(
    async (newX: number, newY: number, cost: number) => {
      const u = userRef.current;
      if (!u || (u.steps_banked ?? 0) < cost) return;
      const newSteps = Math.max(0, (u.steps_banked ?? 0) - cost);
      movementBudget.value = newSteps;
      const now = new Date().toISOString();
      setUser({
        ...u,
        world_x: newX,
        world_y: newY,
        steps_banked: newSteps,
        last_sync_time: now,
      });
      try {
        await supabase
          .from("profiles")
          .update({
            world_x: newX,
            world_y: newY,
            steps_banked: newSteps,
            last_sync_time: now,
          })
          .eq("id", u.id);
      } catch (e) {
        console.warn("[WorldMap] Travel sync failed:", e);
      }
      refreshVision(newX, newY, true, flushPendingVision);
    },
    [movementBudget, setUser, refreshVision, flushPendingVision],
  );

  const fastTravel = useCallback(
    async (stepsAvailable: number) => {
      if (!user) return;
      const tilesToMove = Math.floor(stepsAvailable / STEPS_PER_TILE);
      if (tilesToMove < 1) {
        const newBank = (user.steps_banked ?? 0) + stepsAvailable;
        movementBudget.value = newBank;
        const now = new Date().toISOString();
        setUser({ ...user, steps_banked: newBank, last_sync_time: now });
        await supabase
          .from("profiles")
          .update({ steps_banked: newBank, last_sync_time: now })
          .eq("id", user.id);
        return;
      }
      const ny = (user.world_y || 0) + tilesToMove;
      const nx = user.world_x || 0;
      const now = new Date().toISOString();
      await AsyncStorage.setItem(
        "last_known_coords",
        JSON.stringify({ x: nx, y: ny }),
      ).catch(() => {});
      setUser({ ...user, world_y: ny, last_sync_time: now });
      setAutoTravelReport({
        tilesTraveled: tilesToMove,
        xpGained: tilesToMove * 50,
        itemsFound: Math.random() > 0.5 ? ["Mana Crystal"] : [],
      });
    },
    [user, setUser, movementBudget, setAutoTravelReport],
  );

  const bankSteps = useCallback(
    async (steps: number) => {
      if (!user || steps <= 0) return;
      const newBank = (user.steps_banked ?? 0) + steps;
      movementBudget.value = newBank;
      const now = new Date().toISOString();
      setUser({ ...user, steps_banked: newBank, last_sync_time: now });
      await supabase
        .from("profiles")
        .update({ steps_banked: newBank, last_sync_time: now })
        .eq("id", user.id);
    },
    [user, setUser, movementBudget],
  );

  const handleSystemChoice = useCallback(
    async (choice: "AUTO" | "MANUAL") => {
      const steps = pendingSteps;
      if (steps <= 0) return;
      // Invalidate any in-flight pedometer read so it cannot re-set pending after dismiss
      acknowledgeOfflineStepsPrompt();
      if (choice === "AUTO") await fastTravel(steps);
      else await bankSteps(steps);
      // Advance sync anchor so getStepCountAsync(last_sync, now) does not re-count this batch
      const now = new Date().toISOString();
      (setUser as Dispatch<SetStateAction<User | null>>)((prev) =>
        prev ? { ...prev, last_sync_time: now } : null,
      );
      if (user?.id) {
        // Persist sync anchor so refreshProfile/user reload doesn't revert it and re-open prompt.
        supabase
          .from("profiles")
          .update({ last_sync_time: now })
          .eq("id", user.id)
          .then();
      }
    },
    [
      pendingSteps,
      acknowledgeOfflineStepsPrompt,
      fastTravel,
      bankSteps,
      setUser,
      user?.id,
    ],
  );

  const startTestBattle = useCallback(async () => {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { data, error } = await supabase
        .from("encounter_pool")
        .select("id")
        .limit(10);
      if (error) throw error;
      if (data?.length) {
        const randomId = data[Math.floor(Math.random() * data.length)].id;
        const u = userRef.current;
        if (!u) return;
        const shop = await ensureShopItemsForPreview();
        const ap = activePetRef.current;
        const partyPreview: PartyPreviewItem[] = [
          { type: "player" as const, user: u, allShopItems: shop },
        ];
        if (ap?.pet_details) {
          partyPreview.push({
            type: "pet" as const,
            petDetails: ap.pet_details,
          });
        }
        const snapshot = await captureMapSnapshotForBattle();
        startTransition(
          snapshot,
          () =>
            navigation.navigate("Battle", {
              encounterId: randomId,
              mapId: activeMapId,
            }),
          partyPreview,
        );
      } else {
        Alert.alert("System Error", "No encounters found in pool.");
      }
    } catch (err) {
      console.error("Error starting test battle:", err);
      Alert.alert("System Error", "Failed to initialize test combat.");
    }
  }, [
    startTransition,
    navigation,
    ensureShopItemsForPreview,
    captureMapSnapshotForBattle,
    activeMapId,
  ]);

  const handlePressWorld = useCallback(() => setTravelMenuVisible(true), []);
  const handlePressTemple = useCallback(
    () => navigation.navigate("Temple"),
    [navigation],
  );

  useEffect(() => {
    if (user && user.level > previousLevel) {
      setLevelUpVisible(true);
    }
  }, [user?.level, previousLevel]);

  const partyMembers = user?.current_party_id
    ? Array.from(partyMembersOnline.values())
    : [];

  return (
    <View style={worldMapStyles.container}>
      <Reanimated.View
        ref={viewRef}
        style={StyleSheet.absoluteFill}
        collapsable={false}
      >
        <MapLoadingOverlay
          loading={loadingMap}
          error={mapError}
          onRetry={loadData}
        />

        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#1a1c0e" }]}
        />

        <SkiaWorldMap
          visionGrid={stableVisionGridRef.current}
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
          movementBudget={movementBudget}
          spendMovementBudget={spendStepsBank}
          mapLeft={mapLeft}
          mapTop={mapTop}
          onTileEnter={onTileEnter}
          onTileMoveStart={onTileMoveStartStable}
          onTileMoveBlocked={onTileMoveBlockedStable}
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
          onPressTemple={handlePressTemple}
          onPressWorld={handlePressWorld}
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
          visible={pendingSteps > 0 && step !== "NAV_MAP"}
          pendingSteps={pendingSteps}
          floatAnim={floatAnim}
          pulseAnim={pulseAnim}
          spin={spin}
          onAuto={() => handleSystemChoice("AUTO")}
          onManual={() => handleSystemChoice("MANUAL")}
        />

        <InteractionModal
          visible={!!activeInteraction || !!selectedNode}
          onClose={() => {
            handleCloseInteraction();
            setSelectedNode(null);
          }}
          activeInteraction={activeInteraction || selectedNode}
          mapId={activeMapId}
        />

        <LevelUpModal
          visible={levelUpVisible}
          user={user}
          fromLevel={previousLevel}
          toLevel={user?.level ?? previousLevel}
          onClose={() => {
            setLevelUpVisible(false);
            if (user) setPreviousLevel(user.level);
          }}
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
