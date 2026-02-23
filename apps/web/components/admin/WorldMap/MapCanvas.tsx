'use client';
import React, { useRef, useEffect } from 'react';
import { useMapStore } from '@/lib/store/mapStore';

interface MapCanvasProps {
  width: number;
  height: number;
  scale: number;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ width, height, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { tiles } = useMapStore();
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [tick, forceUpdate] = React.useState({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    tiles.forEach(tile => {
      let img = imageCache.current.get(tile.imageUrl);
      if (!img) {
        img = new Image();
        img.src = tile.imageUrl;
        img.onload = () => forceUpdate({});
        imageCache.current.set(tile.imageUrl, img);
      }
      if (img.complete) {
         ctx.drawImage(img, tile.x * 64 + width / 2, tile.y * 64 + height / 2, 64, 64);
      }
    });
  }, [tiles, width, height, tick]);

  return (
    <canvas 
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
