import React from 'react';
import { useCursorStore } from '@/lib/store/cursorStore';

interface CoordinateDisplayProps {
}

export const CoordinateDisplay = React.memo(({ }: CoordinateDisplayProps) => {
  const cursorCoords = useCursorStore(state => state.cursorCoords);
  const { x, y } = cursorCoords;
  return (
    <div className="flex items-center gap-2 border-l border-slate-700 pl-4 font-mono text-cyan-400">
      X: {x} Y: {y}
    </div>
  );
});

CoordinateDisplay.displayName = 'CoordinateDisplay';
