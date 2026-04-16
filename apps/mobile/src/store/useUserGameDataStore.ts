import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserGameDataState {
  pets: Record<string, any[]>;
  userSkills: Record<string, any[]>;
  skillLoadout: Record<string, string[]>;
  _hasHydrated: boolean;
  setPets: (userId: string, pets: any[]) => void;
  setUserSkills: (userId: string, skills: any[]) => void;
  setSkillLoadout: (userId: string, loadout: string[]) => void;
  waitForHydration: () => Promise<void>;
}

export const useUserGameDataStore = create<UserGameDataState>()(
  persist(
    (set, get) => ({
      pets: {},
      userSkills: {},
      skillLoadout: {},
      _hasHydrated: false,
      setPets: (userId, pets) =>
        set((s) => ({ pets: { ...s.pets, [userId]: pets } })),
      setUserSkills: (userId, skills) =>
        set((s) => ({ userSkills: { ...s.userSkills, [userId]: skills } })),
      setSkillLoadout: (userId, loadout) =>
        set((s) => ({ skillLoadout: { ...s.skillLoadout, [userId]: loadout } })),
      waitForHydration: () => {
        if (get()._hasHydrated) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const unsub = useUserGameDataStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      },
    }),
    {
      name: "user-game-data-cache",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pets: state.pets,
        userSkills: state.userSkills,
        skillLoadout: state.skillLoadout,
      }),
      onRehydrateStorage: () => () => {
        useUserGameDataStore.setState({ _hasHydrated: true });
      },
    }
  )
);
