import { useRef, useMemo, useCallback } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { makeImageFromView } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";
import type { AnimatedRef } from "react-native-reanimated";
import type { View } from "react-native";
import { supabase } from "@/lib/supabase";
import type { PartyPreviewItem } from "@/context/TransitionContext";
import type { UseExplorationOptions } from "@/hooks/useExploration";
import type { User } from "@/types/user";

/** Paste `encounter_pool.id` for the scripted demo; empty string disables. */
export const JEFFREY_MAP_DEMO_ENCOUNTER_ID =
  "48a4be65-2fd1-42de-a5fe-2ef71c6b6f8e";

/** Processed grid tile enters (from `useExploration`) before battle starts. */
export const JEFFREY_MAP_DEMO_TRIGGER_TILES = 3;

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
}: UseJeffreyMapDemoParams) {
  const suppressEncounterRollRef = useRef(false);
  const tilesProcessedRef = useRef(0);
  const demoDoneRef = useRef(false);
  const onProcessedTileEnterRef = useRef<(nx: number, ny: number) => void>(
    () => {},
  );
  const triggerBattleRef = useRef<() => void | Promise<void>>(() => {});

  const ensureShopItemsForPreview = useCallback(async () => {
    const cached = allShopItemsRef.current;
    if (cached?.length) return cached;
    const { data, error } = await supabase.from("shop_items").select("*");
    if (error) return [];
    return data ?? [];
  }, [allShopItemsRef]);

  /** Avoid `InteractionManager.runAfterInteractions` — it can block until the D-pad touch ends. */
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

  onProcessedTileEnterRef.current = (_nx: number, _ny: number) => {
    if (!encounterId || demoDoneRef.current) return;
    tilesProcessedRef.current += 1;
    logDev("processed tile", {
      count: tilesProcessedRef.current,
      need: JEFFREY_MAP_DEMO_TRIGGER_TILES,
    });
    if (tilesProcessedRef.current < JEFFREY_MAP_DEMO_TRIGGER_TILES) return;
    demoDoneRef.current = true;
    suppressEncounterRollRef.current = true;
    logDev("threshold reached — trigger battle");
    void triggerBattleRef.current();
  };

  const explorationOptions: UseExplorationOptions = useMemo(
    () => ({
      suppressEncounterRollRef: suppressEncounterRollRef,
      onProcessedTileEnter: (nx: number, ny: number) =>
        onProcessedTileEnterRef.current(nx, ny),
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
