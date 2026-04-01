import { useRef, useMemo, useCallback } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { makeImageFromView } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";
import type { AnimatedRef } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import type { View } from "react-native";
import { supabase } from "@/lib/supabase";
import type { PartyPreviewItem } from "@/context/TransitionContext";
import type { UseExplorationOptions } from "@/hooks/useExploration";
import type { User } from "@/types/user";

/** Paste `encounter_pool.id` for the scripted demo; empty string disables. */
export const JEFFREY_MAP_DEMO_ENCOUNTER_ID =
  "48a4be65-2fd1-42de-a5fe-2ef71c6b6f8e";

/** Banked steps spent on the world map before Jeffrey fires. */
export const JEFFREY_MAP_DEMO_TRIGGER_STEPS = 300;

const LOG_PREFIX = "[JeffreyMapDemo]";

function logDev(message: string, payload?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (payload) console.log(LOG_PREFIX, message, payload);
  else console.log(LOG_PREFIX, message);
}

export interface UseJeffreyMapDemoParams {
  /** When falsy, demo is off (no counter, no battle). */
  encounterId: string;
  /** Active world map id for encounter pool cache lookup on Battle. */
  mapId: string | null;
  userRef: React.MutableRefObject<User | null>;
  activePetRef: React.MutableRefObject<{ pet_details?: unknown } | null>;
  allShopItemsRef: React.MutableRefObject<unknown[]>;
  viewRef: AnimatedRef<View>;
  navigation: { navigate: (name: string, params?: Record<string, unknown>) => void };
  startTransition: (
    image: SkImage | null,
    onHalfway: () => void,
    preview?: PartyPreviewItem[],
  ) => void;
  /** Shared value controlling movement direction — set to null to stop movement before snapshot. */
  activeDirection: SharedValue<"UP" | "DOWN" | "LEFT" | "RIGHT" | null>;
  /** Shared value for movement state — set to false to stop movement before snapshot. */
  isMoving: SharedValue<boolean>;
}

export function useJeffreyMapDemo({
  encounterId,
  mapId,
  userRef,
  activePetRef,
  allShopItemsRef,
  viewRef,
  navigation,
  startTransition,
  activeDirection,
  isMoving,
}: UseJeffreyMapDemoParams) {
  const suppressEncounterRollRef = useRef(false);
  const demoDoneRef = useRef(false);
  const bankedStepsSpentRef = useRef(0);
  const triggerBattleRef = useRef<() => void | Promise<void>>(() => {});

  const ensureShopItemsForPreview = useCallback(async () => {
    const cached = allShopItemsRef.current;
    if (cached?.length) return cached;
    const { data, error } = await supabase.from("shop_items").select("*");
    if (error) return [];
    return data ?? [];
  }, [allShopItemsRef]);

  /** Wait one frame + 50ms for the current animation to settle, then capture. */
  const captureMapSnapshotForBattle = useCallback(async (): Promise<SkImage | null> => {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => setTimeout(r, 50));
    try {
      return await makeImageFromView(viewRef);
    } catch (e) {
      logDev("makeImageFromView failed", { error: String(e) });
      return null;
    }
  }, [viewRef]);

  const startJeffreyBattleTransition = useCallback(async () => {
    if (!encounterId) return;
    const u = userRef.current;
    if (!u?.id) {
      logDev("skip battle: no user on ref");
      if (__DEV__) {
        Alert.alert("Jeffrey demo", "No user session — cannot start battle.");
      }
      return;
    }
    // Stop movement immediately — before any awaits — so the player halts
    // the instant Jeffrey fires, not after the DB fetch completes.
    activeDirection.value = null;
    isMoving.value = false;
    try {
      logDev("starting battle transition");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        () => navigation.navigate("Battle", { encounterId, mapId }),
        partyPreview,
      );
    } catch (err) {
      logDev("battle transition threw", { error: String(err) });
      console.error(`${LOG_PREFIX} battle failed`, err);
      Alert.alert("System Error", "Failed to start demo combat.");
    }
  }, [
    encounterId,
    mapId,
    userRef,
    activePetRef,
    ensureShopItemsForPreview,
    captureMapSnapshotForBattle,
    startTransition,
    navigation,
  ]);

  triggerBattleRef.current = startJeffreyBattleTransition;

  /**
   * Called by WorldMapScreen's spendStepsBank every time banked steps are
   * successfully spent. Accumulates the total and fires Jeffrey once the
   * threshold is reached.
   */
  const onBankedStepsSpent = useCallback(
    (cost: number) => {
      if (!encounterId || demoDoneRef.current) return;
      bankedStepsSpentRef.current += cost;
      logDev("banked steps spent", {
        total: bankedStepsSpentRef.current,
        need: JEFFREY_MAP_DEMO_TRIGGER_STEPS,
      });
      if (bankedStepsSpentRef.current < JEFFREY_MAP_DEMO_TRIGGER_STEPS) return;
      demoDoneRef.current = true;
      suppressEncounterRollRef.current = true;
      logDev("threshold reached — triggering battle");
      void triggerBattleRef.current();
    },
    [encounterId],
  );

  const explorationOptions: UseExplorationOptions = useMemo(
    () => ({
      suppressEncounterRollRef: suppressEncounterRollRef,
    }),
    [],
  );

  return {
    explorationOptions,
    onBankedStepsSpent,
    ensureShopItemsForPreview,
    captureMapSnapshotForBattle,
    startJeffreyBattleTransition,
  };
}
