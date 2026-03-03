import React, { useEffect, useRef } from 'react';

interface BrushPreviewProps {
  isSpacePressed: boolean;
  selectedTool: string;
  selectedTileId: string | null;
  customTiles: any[];
  cursorCoords: { x: number; y: number };
  smoothCursorCoords: { x: number; y: number };
  TILE_SIZE: number;
  WORLD_SIZE: number;
  brushSize: number;
  brushMode: boolean;
  selectedSmartType: string;
  snapMode: 'full' | 'half' | 'free';
}

const snapPosition = (smooth: number, snapMode: 'full' | 'half' | 'free', gridCoord: number, tileSize: number, worldSize: number): number => {
  if (snapMode === 'free') return smooth + worldSize / 2;
  const halfTile = tileSize / 2;
  if (snapMode === 'half') return Math.round(smooth / halfTile) * halfTile + worldSize / 2;
  return gridCoord * tileSize + worldSize / 2;
};

export const BrushPreview = React.memo(({
  isSpacePressed, selectedTool, selectedTileId, customTiles, cursorCoords, smoothCursorCoords, TILE_SIZE, WORLD_SIZE, brushSize, brushMode, selectedSmartType, snapMode
}: BrushPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isSpacePressed || (selectedTool !== 'paint' && selectedTool !== 'erase' && selectedTool !== 'collision')) return;
    if (selectedTool === 'paint' && !selectedTileId && selectedSmartType === 'off') return;

    const brushLimit = brushMode ? brushSize : 1;
    const half = Math.floor(brushLimit / 2);
    const isEven = brushLimit % 2 === 0;
    const tile = (selectedTool === 'paint' || selectedTool === 'collision') ? customTiles.find((t: any) => t.id === selectedTileId) : null;
    
    const displayHeight = tile?.frameHeight || TILE_SIZE;
    const displayWidth = tile?.frameWidth || displayHeight;

    // Center point of the canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Correct offset for even brush sizes to match selection logic
    const gridOffset = isEven ? TILE_SIZE / 2 : 0;

    for (let dy = -half; dy < (isEven ? half : half + 1); dy++) {
      for (let dx = -half; dx < (isEven ? half : half + 1); dx++) {
        const x = centerX + dx * TILE_SIZE - (isEven ? 0 : TILE_SIZE / 2);
        const y = centerY + dy * TILE_SIZE - (isEven ? 0 : TILE_SIZE / 2);

        if (selectedTool === 'erase') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (selectedTool === 'collision') {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.3)';
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (selectedTool === 'paint') {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
          
          if (!tile && selectedSmartType !== 'off') {
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          } else if (tile) {
            const drawX = x - (displayWidth - TILE_SIZE) / 2;
            const drawY = y - (displayHeight - TILE_SIZE);
            ctx.fillRect(drawX, drawY, displayWidth, displayHeight);
            ctx.strokeRect(drawX, drawY, displayWidth, displayHeight);
          }
        }
      }
    }
  }, [isSpacePressed, selectedTool, selectedTileId, customTiles, brushSize, brushMode, selectedSmartType, TILE_SIZE]);

  if (isSpacePressed || (selectedTool !== 'paint' && selectedTool !== 'erase' && selectedTool !== 'collision')) return null;

  const leftPos = snapPosition(smoothCursorCoords.x, snapMode, cursorCoords.x, TILE_SIZE, WORLD_SIZE);
  const topPos = snapPosition(smoothCursorCoords.y, snapMode, cursorCoords.y, TILE_SIZE, WORLD_SIZE);
  
  const brushLimit = brushMode ? brushSize : 1;
  const totalSize = brushLimit * TILE_SIZE;
  const canvasPadding = TILE_SIZE * 4; // Extra space for large props

  return (
    <canvas
      ref={canvasRef}
      width={totalSize + canvasPadding}
      height={totalSize + canvasPadding}
      className="absolute pointer-events-none z-[60]"
      style={{
        left: leftPos - (totalSize + canvasPadding) / 2 + (snapMode === 'full' ? TILE_SIZE / 2 : 0),
        top: topPos - (totalSize + canvasPadding) / 2 + (snapMode === 'full' ? TILE_SIZE / 2 : 0),
        imageRendering: 'pixelated'
      }}
    />
  );
});

BrushPreview.displayName = 'BrushPreview';
