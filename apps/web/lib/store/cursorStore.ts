// lib/store/cursorStore.ts
import { create } from 'zustand';

interface CursorState {
  cursorCoords: { x: number; y: number };
  smoothCursorCoords: { x: number; y: number };
  isDrawing: boolean;
  setCursorCoords: (coords: { x: number; y: number }) => void;
  setSmoothCursorCoords: (coords: { x: number; y: number }) => void;
  setIsDrawing: (isDrawing: boolean) => void;
}

export const useCursorStore = create<CursorState>((set) => ({
  cursorCoords: { x: 0, y: 0 },
  smoothCursorCoords: { x: 0, y: 0 },
  isDrawing: false,
  setCursorCoords: (coords) => set({ cursorCoords: coords }),
  setSmoothCursorCoords: (coords) => set({ smoothCursorCoords: coords }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
}));
