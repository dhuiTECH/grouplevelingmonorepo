import React from 'react';

interface CoordinateDisplayProps {
  x: number;
  y: number;
  smoothX?: number;
  smoothY?: number;
}

export const CoordinateDisplay = React.memo(({ x, y, smoothX, smoothY }: CoordinateDisplayProps) => {
  return (
    <div className="flex items-center gap-2 border-l border-slate-700 pl-4 font-mono text-cyan-400">
      X: {x} Y: {y}
    </div>
  );
});

CoordinateDisplay.displayName = 'CoordinateDisplay';
