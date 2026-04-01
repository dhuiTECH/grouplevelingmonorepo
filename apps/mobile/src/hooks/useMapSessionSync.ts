import { useEffect, useCallback, useRef, type MutableRefObject } from "react";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "@/lib/supabase";

const BATCH_MS = 120_000;

/**
 * Batches world position to Supabase on background, interval, and unmount.
 * Does not send steps_banked (client movement uses local budget only).
 */
export function useMapSessionSync(
  userId: string | undefined,
  latestPosRef: MutableRefObject<{ x: number; y: number } | null>,
): { flushPosition: () => Promise<void> } {
  const flushing = useRef(false);

  const flushPosition = useCallback(async () => {
    const pos = latestPosRef.current;
    if (!userId || !pos) return;
    if (flushing.current) return;
    flushing.current = true;
    try {
      const now = new Date().toISOString();
      await supabase
        .from("profiles")
        .update({
          world_x: pos.x,
          world_y: pos.y,
          last_sync_time: now,
        })
        .eq("id", userId);
    } catch (e) {
      console.warn("[useMapSessionSync] flush failed:", e);
    } finally {
      flushing.current = false;
    }
  }, [userId, latestPosRef]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "background" || s === "inactive") void flushPosition();
    });
    const id = setInterval(() => void flushPosition(), BATCH_MS);
    return () => {
      sub.remove();
      clearInterval(id);
      void flushPosition();
    };
  }, [flushPosition]);

  return { flushPosition };
}
