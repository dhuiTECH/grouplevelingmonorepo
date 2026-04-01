import { create } from "zustand";

interface EncounterPoolState {
  encountersByMap: Record<string, any[]>;
  setPoolForMap: (mapId: string, encounters: any[]) => void;
  getEncounterById: (mapId: string, encounterId: string) => any | undefined;
}

export const useEncounterPoolStore = create<EncounterPoolState>((set, get) => ({
  encountersByMap: {},
  setPoolForMap: (mapId, encounters) =>
    set((s) => ({
      encountersByMap: { ...s.encountersByMap, [mapId]: encounters },
    })),
  getEncounterById: (mapId, encounterId) => {
    const pool = get().encountersByMap[mapId] ?? [];
    return pool.find((e) => String(e?.id) === String(encounterId));
  },
}));
