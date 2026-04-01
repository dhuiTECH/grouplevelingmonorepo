import { useRef, useMemo, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { makeImageFromView } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";
import type { AnimatedRef } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import type { View } from "react-native";
import { Pedometer } from "expo-sensors";
import { supabase } from "@/lib/supabase";
import type { PartyPreviewItem } from "@/context/TransitionContext";
import type { UseExplorationOptions } from "@/hooks/useExploration";
import type { User } from "@/types/user";

/** Paste `encounter_pool.id` for the scripted demo; empty string disables. */
export const JEFFREY_MAP_DEMO_ENCOUNTER_ID =
  "48a4be65-2fd1-42de-a5fe-2ef71c6b6f8e";

/** Real pedometer steps required to trigger the Jeffrey battle. */
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
  /**
   * Ref that always points to `flushPendingVision` from useExploration.
   * Using a ref avoids hook-ordering constraints (Jeffrey is constructed before useExploration).
   */
  flushPendingVisionRef: React.MutableRefObject<() => void>;
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
  flushPendingVisionRef,
}: UseJeffreyMapDemoParams) {
  const suppressEncounterRollRef = useRef(false);
  const demoDoneRef = useRef(false);
  const triggerBattleRef = useRef<() => void | Promise<void>>(() => {});

  const ensureShopItemsForPreview = useCallback(async () => {
    const cached = allShopItemsRef.current;
    if (cached?.length) return cached;
    const { data, error } = await supabase.from("shop_items").select("*");
    if (error) return [];
    return data ?? [];
  }, [allShopItemsRef]);

  /**
   * Stop movement, flush deferred vision, then wait for the animation to fully
   * settle before capturing — mirrors what happens when the player taps the
   * battle button while standing still.
   */
  const captureMapSnapshotForBattle = useCallback(async (): Promise<SkImage | null> => {
    activeDirection.value = null;
    isMoving.value = false;
    flushPendingVisionRef.current();
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise<void>((r) => setTimeout(r, 150));
    try {
      return await makeImageFromView(viewRef);
    } catch (e) {
      logDev("makeImageFromView failed", { error: String(e) });
      return null;
    }
  }, [viewRef, activeDirection, isMoving, flushPendingVisionRef]);

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
   * Live pedometer subscription — triggers Jeffrey after JEFFREY_MAP_DEMO_TRIGGER_STEPS
   * real steps taken on the world map.  Unsubscribes automatically after firing or on unmount.
   */
  useEffect(() => {
    if (!encounterId) return;

    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    let stepBaseline: number | null = null;

    (async () => {
      const available = await Pedometer.isAvailableAsync();
      if (!available || cancelled) {
        logDev("pedometer unavailable or cancelled before start");
        return;
      }

      logDev("pedometer subscription started", { need: JEFFREY_MAP_DEMO_TRIGGER_STEPS });

      subscription = Pedometer.watchStepCount((result) => {
        if (cancelled || demoDoneRef.current) return;

        if (stepBaseline === null) {
          stepBaseline = result.steps;
          logDev("step baseline set", { baseline: stepBaseline });
          return;
        }

        const delta = result.steps - stepBaseline;
        logDev("step update", { delta, need: JEFFREY_MAP_DEMO_TRIGGER_STEPS });

        if (delta >= JEFFREY_MAP_DEMO_TRIGGER_STEPS) {
          demoDoneRef.current = true;
          suppressEncounterRollRef.current = true;
          subscription?.remove();
          subscription = null;
          logDev("step threshold reached — triggering battle");
          void triggerBattleRef.current();
        }
      });
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [encounterId]);

  const explorationOptions: UseExplorationOptions = useMemo(
    () => ({
      suppressEncounterRollRef: suppressEncounterRollRef,
    }),
    [],
  );

  return {
    explorationOptions,
    ensureShopItemsForPreview,
    captureMapSnapshotForBattle,
    startJeffreyBattleTransition,
  };
}
