import { useState, useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import { Pedometer } from "expo-sensors";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Tracks "offline" steps since profile last_sync_time for the Energy Collected modal.
 * - Invalidates in-flight pedometer reads when the user dismisses the prompt so stale results cannot re-open it.
 * - Callers must advance user.last_sync_time after AUTO/MANUAL so the next window does not re-count the same steps.
 */
export const useStepTracker = () => {
  const { user } = useAuth();
  const [pendingSteps, setPendingSteps] = useState(0);
  const checkGenerationRef = useRef(0);
  const lastPromptAnchorRef = useRef<string | null>(null);

  const acknowledgeOfflineStepsPrompt = useCallback(() => {
    checkGenerationRef.current += 1;
    setPendingSteps(0);
  }, []);

  const checkOfflineSteps = useCallback(async () => {
    if (!user?.last_sync_time) return;
    if (pendingSteps > 0) return;

    const anchor = `${user.id}:${user.last_sync_time}`;
    if (lastPromptAnchorRef.current === anchor) return;

    const myGeneration = ++checkGenerationRef.current;
    const now = new Date();
    const lastSync = new Date(user.last_sync_time);

    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) return;

    try {
      const result = await Pedometer.getStepCountAsync(lastSync, now);
      if (myGeneration !== checkGenerationRef.current) return;
      if (result.steps > 50) {
        lastPromptAnchorRef.current = anchor;
        setPendingSteps(result.steps);
      }
    } catch (error) {
      console.error("Error fetching step count:", error);
    }
  }, [user?.last_sync_time, user?.id, pendingSteps]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active" && user) void checkOfflineSteps();
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    void checkOfflineSteps();

    return () => sub.remove();
  }, [user, checkOfflineSteps]);

  return { pendingSteps, acknowledgeOfflineStepsPrompt };
};
