import { create } from 'zustand';

export type BootStep =
  | 'INITIALIZING'
  | 'CHECKING_VERSION'
  | 'DOWNLOADING'
  | 'READY'
  | 'ERROR';

export interface BootState {
  bootStep: BootStep;
  progress: number;
  errorMessage: string | null;
}

export interface BootActions {
  setBootStep: (step: BootStep) => void;
  setProgress: (progress: number) => void;
  setErrorMessage: (message: string | null) => void;
  reset: () => void;
}

const initialState: BootState = {
  bootStep: 'INITIALIZING',
  progress: 0,
  errorMessage: null,
};

export const useBootStore = create<BootState & BootActions>((set) => ({
  ...initialState,

  setBootStep: (step) => set({ bootStep: step }),
  setProgress: (progress) => set({ progress }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  reset: () => set({ ...initialState }),
}));
