import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface GameDataState {
  encounterPool: any[];
  customTiles: any[];
  skills: any[];
  skillAnimations: any[];
  shopItems: any[];
  worldMapNodes: any[];
  worldMapSettings: any | null;
  commonFoods: any[];
  classes: any[];
  activeMapId: string | null;
  _hasHydrated: boolean;
  setAll: (data: Partial<Omit<GameDataState, "_hasHydrated" | "setAll" | "waitForHydration">>) => void;
  waitForHydration: () => Promise<void>;
}

export const useGameDataStore = create<GameDataState>()(
  persist(
    (set, get) => ({
      encounterPool: [],
      customTiles: [],
      skills: [],
      skillAnimations: [],
      shopItems: [],
      worldMapNodes: [],
      worldMapSettings: null,
      commonFoods: [],
      classes: [],
      activeMapId: null,
      _hasHydrated: false,
      setAll: (data) => set((s) => ({ ...s, ...data })),
      waitForHydration: () => {
        if (get()._hasHydrated) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const unsub = useGameDataStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      },
    }),
    {
      name: "game-data-cache",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        encounterPool: state.encounterPool,
        customTiles: state.customTiles,
        skills: state.skills,
        skillAnimations: state.skillAnimations,
        shopItems: state.shopItems,
        worldMapNodes: state.worldMapNodes,
        worldMapSettings: state.worldMapSettings,
        commonFoods: state.commonFoods,
        classes: state.classes,
        activeMapId: state.activeMapId,
      }),
      onRehydrateStorage: () => () => {
        useGameDataStore.setState({ _hasHydrated: true });
      },
    }
  )
);
