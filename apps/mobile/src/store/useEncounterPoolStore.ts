import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface EncounterPoolState {
  encountersByMap: Record<string, any[]>;
  _hasHydrated: boolean;
  setPoolForMap: (mapId: string, encounters: any[]) => void;
  getEncounterById: (mapId: string, encounterId: string) => any | undefined;
  waitForHydration: () => Promise<void>;
}

export const useEncounterPoolStore = create<EncounterPoolState>()(
  persist(
    (set, get) => ({
      encountersByMap: {},
      _hasHydrated: false,
      setPoolForMap: (mapId, encounters) =>
        set((s) => ({
          encountersByMap: { ...s.encountersByMap, [mapId]: encounters },
        })),
      getEncounterById: (mapId, encounterId) => {
        const pool = get().encountersByMap[mapId] ?? [];
        return pool.find((e) => String(e?.id) === String(encounterId));
      },
      waitForHydration: () => {
        if (get()._hasHydrated) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const unsub = useEncounterPoolStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      },
    }),
    {
      name: "encounter-pool-cache",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ encountersByMap: state.encountersByMap }),
      onRehydrateStorage: () => () => {
        useEncounterPoolStore.setState({ _hasHydrated: true });
      },
    }
  )
);
