import { StateCreator } from 'zustand';
import { MapState, HistorySlice } from '../types';

export const createHistorySlice: StateCreator<
  MapState,
  [],
  [],
  HistorySlice
> = (set) => ({
  undoStack: [],
  setUndoStack: (updater) => set((state) => ({ undoStack: updater(state.undoStack) })),
  pushUndo: (action) => set((state) => ({ undoStack: [...state.undoStack, action] })),
});
