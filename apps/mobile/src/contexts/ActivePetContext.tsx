import React, { createContext, useContext, useState, useCallback } from 'react';

interface ActivePetContextValue {
  activePetId: string | null;
  setActivePetId: (id: string | null) => void;
}

const ActivePetContext = createContext<ActivePetContextValue | null>(null);

export function ActivePetProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [activePetId, setActivePetIdState] = useState<string | null>(null);
  const setActivePetId = useCallback((id: string | null) => setActivePetIdState(id), []);
  return (
    <ActivePetContext.Provider value={{ activePetId, setActivePetId }}>
      {children}
    </ActivePetContext.Provider>
  );
}

export function useActivePet(): ActivePetContextValue {
  const ctx = useContext(ActivePetContext);
  if (!ctx) {
    return {
      activePetId: null,
      setActivePetId: () => {},
    };
  }
  return ctx;
}
