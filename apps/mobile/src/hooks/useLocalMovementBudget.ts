import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pedometer } from "expo-sensors";
import {
  useSharedValue,
  type SharedValue,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";

const STORAGE_KEY = "local_movement_step_budget_v1";

/** Device steps consumed per map tile (same ratio as legacy MOVE_COST). */
export const STEPS_PER_TILE = 100;

/**
 * Client-side movement fuel from the device pedometer (expo-sensors).
 * Budget is persisted locally; profile position syncs in batches via useMapSessionSync.
 */
export function useLocalMovementBudget(): {
  movementBudget: SharedValue<number>;
  displayBudget: number;
  spendMovementBudget: (cost: number) => boolean;
  addMovementBudget: (amount: number) => void;
} {
  const movementBudget = useSharedValue(0);
  const [displayBudget, setDisplayBudget] = useState(0);
  const lastPedometerSteps = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useAnimatedReaction(
    () => movementBudget.value,
    (v) => {
      runOnJS(setDisplayBudget)(Math.floor(v));
    },
  );

  const persist = useCallback(() => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      String(Math.floor(movementBudget.value)),
    ).catch(() => {});
  }, [movementBudget]);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const n = raw ? parseInt(raw, 10) : 0;
        if (mountedRef.current && Number.isFinite(n) && n >= 0) {
          movementBudget.value = n;
        }
      } catch {
        /* ignore */
      }

      const pedoOk = await Pedometer.isAvailableAsync();
      if (!pedoOk || !mountedRef.current) return;

      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      try {
        const r = await Pedometer.getStepCountAsync(startOfDay, now);
        lastPedometerSteps.current = r.steps ?? 0;
      } catch {
        /* ignore */
      }

      const tick = async () => {
        if (!mountedRef.current) return;
        try {
          const end = new Date();
          const r = await Pedometer.getStepCountAsync(startOfDay, end);
          const steps = r.steps ?? 0;
          const delta = Math.max(0, steps - lastPedometerSteps.current);
          lastPedometerSteps.current = steps;
          if (delta > 0) movementBudget.value += delta;
        } catch {
          /* ignore */
        }
      };

      void tick();
      const id = setInterval(tick, 4000);
      pollRef.current = id;
    })();

    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "background" || s === "inactive") persist();
    });

    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      sub.remove();
      persist();
    };
  }, [movementBudget, persist]);

  useEffect(() => {
    const id = setInterval(() => persist(), 30_000);
    return () => clearInterval(id);
  }, [persist]);

  const spendMovementBudget = useCallback(
    (cost: number) => {
      if (cost <= 0) return true;
      if (movementBudget.value < cost) return false;
      movementBudget.value -= cost;
      persist();
      return true;
    },
    [movementBudget, persist],
  );

  const addMovementBudget = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      movementBudget.value += amount;
      persist();
    },
    [movementBudget, persist],
  );

  return {
    movementBudget,
    displayBudget,
    spendMovementBudget,
    addMovementBudget,
  };
}
