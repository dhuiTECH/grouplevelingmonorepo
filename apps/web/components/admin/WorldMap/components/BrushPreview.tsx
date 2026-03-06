import React, { useEffect, useRef } from 'react';
import { useCursorStore } from '@/lib/store/cursorStore'; // ⚡️ Import the micro-store

interface BrushPreviewProps {
  isSpacePressed: boolean;
  selectedTool: string;
  selectedTileId: string | null;
  customTiles: any[];
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
  isSpacePressed, selectedTool, selectedTileId, customTiles, TILE_SIZE, WORLD_SIZE, brushSize, brushMode, selectedSmartType, snapMode
}: BrushPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImage, setLoadedImage] = React.useState<HTMLImageElement | null>(null);
  
  // ⚡️ AAA FIX: Subscribe directly to the fast-updating store
  const cursorCoords = useCursorStore(state => state.cursorCoords);
  const smoothCursorCoords = useCursorStore(state => state.smoothCursorCoords);

  useEffect(() => {
    if (selectedTool === 'paint' && selectedTileId) {
      const tile = customTiles.find((t: any) => t.id === selectedTileId);
      if (tile?.url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = tile.url;
        img.onload = () => setLoadedImage(img);
        img.onerror = () => setLoadedImage(null);
      } else {
        setLoadedImage(null);
      }
    } else {
      setLoadedImage(null);
    }
  }, [selectedTool, selectedTileId, customTiles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isSpacePressed || (selectedTool !== 'paint' && selectedTool !== 'erase' && selectedTool !== 'collision')) return;
    if (selectedTool === 'paint' && !selectedTileId && selectedSmartType === 'off') return;

    const brushLimit = brushMode ? brushSize : 1;
    const half = Math.floor(brushLimit / 2);
    const isEven = brushLimit % 2 === 0;
    const tile = (selectedTool === 'paint' || selectedTool === 'collision') ? customTiles.find((t: any) => t.id === selectedTileId) : null;
    
    const displayHeight = tile?.frameHeight || TILE_SIZE;
    const displayWidth = tile?.frameWidth || displayHeight;

    for (let dy = -half; dy < (isEven ? half : half + 1); dy++) {
      for (let dx = -half; dx < (isEven ? half : half + 1); dx++) {
        const x = (dx + half) * TILE_SIZE;
        const y = (dy + half) * TILE_SIZE;

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
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
          
          if (!tile && selectedSmartType !== 'off') {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          } else if (tile) {
            const drawX = x - (displayWidth - TILE_SIZE) / 2;
            const drawY = y - (displayHeight - TILE_SIZE);

            if (loadedImage) {
              // Draw image first
              if (tile.isSpritesheet || (tile.frameCount && tile.frameCount > 1)) {
                ctx.drawImage(loadedImage, 0, 0, displayWidth, displayHeight, drawX, drawY, displayWidth, displayHeight);
              } else {
                ctx.drawImage(loadedImage, drawX, drawY, displayWidth, displayHeight);
              }
              // Then draw green overlay
              ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
              ctx.fillRect(drawX, drawY, displayWidth, displayHeight);
            } else {
              // Fallback
              ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
              ctx.fillRect(drawX, drawY, displayWidth, displayHeight);
            }
            ctx.strokeRect(drawX, drawY, displayWidth, displayHeight);
          }
        }
      }
    }
  }, [isSpacePressed, selectedTool, selectedTileId, customTiles, brushSize, brushMode, selectedSmartType, TILE_SIZE, loadedImage]);

  if (isSpacePressed || (selectedTool !== 'paint' && selectedTool !== 'erase' && selectedTool !== 'collision')) return null;

  const leftPos = snapPosition(smoothCursorCoords.x, snapMode, cursorCoords.x, TILE_SIZE, WORLD_SIZE);
  const topPos = snapPosition(smoothCursorCoords.y, snapMode, cursorCoords.y, TILE_SIZE, WORLD_SIZE);
  
  const brushLimit = brushMode ? brushSize : 1;
  const totalSize = brushLimit * TILE_SIZE;

  return (
    <canvas
      ref={canvasRef}
      width={totalSize}
      height={totalSize}
      className="absolute pointer-events-none z-[60]"
      style={{
        left: snapMode === 'full' ? leftPos - Math.floor(brushLimit / 2) * TILE_SIZE : leftPos - totalSize / 2,
        top: snapMode === 'full' ? topPos - Math.floor(brushLimit / 2) * TILE_SIZE : topPos - totalSize / 2,
        imageRendering: 'pixelated'
      }}
    />
  );
});

BrushPreview.displayName = 'BrushPreview';
