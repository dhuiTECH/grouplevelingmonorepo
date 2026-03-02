import { useState } from 'react';
import { useMapStore, Tile } from '@/lib/store/mapStore';
import { createNoise2D } from 'simplex-noise';
import { supabase } from '@/lib/supabase';

export const useMapGeneration = () => {
  const { customTiles, batchAddTiles, setUndoStack } = useMapStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState<string>(Math.random().toString(36).substring(7));

  const handleAutoFill = async () => {
    if (customTiles.length === 0) {
      alert("Please upload some custom tiles first!");
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      try {
        let seedValue = 0;
        for(let i = 0; i < seed.length; i++) {
            seedValue = ((seedValue << 5) - seedValue) + seed.charCodeAt(i);
            seedValue |= 0;
        }
        let state = seedValue;
        const random = () => {
            state += 0x6D2B79F5;
            let t = state;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
        const noise2D = createNoise2D(random);
        const newTiles: Omit<Tile, 'id'>[] = [];
        const GRID_RADIUS = 30; 
        
        const snapshotBefore = useMapStore.getState().tiles;
        setUndoStack(prev => [...prev, {
          action: 'autofill',
          previousFullTiles: snapshotBefore
        }]);

        const autoFillTiles = customTiles.filter(t => t.isAutoFill !== false);
        
        const waterTiles = autoFillTiles.filter(t => (t.layer ?? 0) < 0 || t.category === 'water_base');
        const groundTiles = autoFillTiles.filter(t => (t.layer ?? 0) === 0 && t.category !== 'water_base' && t.category !== 'foam_strip');
        const roadTiles = autoFillTiles.filter(t => (t.layer ?? 0) === 1 || t.category === 'road');
        const propTiles = autoFillTiles.filter(t => (t.layer ?? 0) >= 2 || t.category === 'prop');

        const tilesByType: Record<string, typeof groundTiles> = {
          water: waterTiles,
          grassland: groundTiles.filter(t => t.type === 'grassland' || t.name.toLowerCase().includes('grass')),
          hill: groundTiles.filter(t => t.type === 'hill' || t.name.toLowerCase().includes('hill')),
          soil: groundTiles.filter(t => t.type === 'soil' || t.name.toLowerCase().includes('soil') || t.name.toLowerCase().includes('dirt')),
        };

        const getTileForType = (type: string) => {
          const candidates = tilesByType[type];
          if (candidates && candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
          
          if (type === 'water') {
             if (waterTiles.length > 0) return waterTiles[Math.floor(Math.random() * waterTiles.length)];
          } else {
             if (groundTiles.length > 0) return groundTiles[Math.floor(Math.random() * groundTiles.length)];
          }
          
          return groundTiles[Math.floor(Math.random() * groundTiles.length)] || waterTiles[0] || autoFillTiles[0];
        };

        if (autoFillTiles.length === 0) {
          alert("No tiles have 'Auto-Fill' enabled!");
          return;
        }

        const currentTiles = useMapStore.getState().tiles;

        for (let x = -GRID_RADIUS; x <= GRID_RADIUS; x++) {
          for (let y = -GRID_RADIUS; y <= GRID_RADIUS; y++) {
            const elevation = noise2D(x / 12, y / 12);
            let tileType = 'grassland';
            let targetLayer = 0;

            if (elevation < -0.3) {
              tileType = 'water';
              targetLayer = -1;
            } else if (elevation > 0.6) {
              tileType = 'hill';
            } else if (elevation <= 0.1) {
              tileType = 'soil';
            }
            
            const groundExists = currentTiles.some(t => t.x === x && t.y === y && (t.layer || 0) === targetLayer);
            if (!groundExists) {
              const selectedTile = getTileForType(tileType);
              if (selectedTile) {
                newTiles.push({ 
                  x, 
                  y, 
                  imageUrl: selectedTile.url, 
                  type: (selectedTile.type || tileType) as any,
                  isSpritesheet: selectedTile.isSpritesheet,
                  frameCount: selectedTile.frameCount,
                  frameWidth: selectedTile.frameWidth,
                  frameHeight: selectedTile.frameHeight,
                  animationSpeed: selectedTile.animationSpeed,
                  isWalkable: selectedTile.isWalkable,
                  layer: targetLayer,
                  snapToGrid: selectedTile.snapToGrid,
                  isAutoFill: selectedTile.isAutoFill,
                  isAutoTile: selectedTile.isAutoTile,
                  rotation: selectedTile.rotation || 0
                });
              }
            }

            if (propTiles.length > 0 && tileType !== 'water') {
              const propExists = currentTiles.some(t => t.x === x && t.y === y && (t.layer || 0) >= 2);
              if (!propExists && Math.random() < 0.08) {
                let validProps = propTiles;
                
                if (tileType === 'grassland') {
                  const foliage = propTiles.filter(p => p.name.toLowerCase().includes('tree') || p.name.toLowerCase().includes('bush') || p.name.toLowerCase().includes('flower'));
                  if (foliage.length > 0) validProps = foliage;
                } else if (tileType === 'soil' || tileType === 'hill') {
                  const rocks = propTiles.filter(p => p.name.toLowerCase().includes('rock') || p.name.toLowerCase().includes('stone'));
                  if (rocks.length > 0) validProps = rocks;
                }

                const selectedProp = validProps[Math.floor(Math.random() * validProps.length)];
                
                if (selectedProp) {
                  let propOffsetX = 0;
                  let propOffsetY = 0;
                  if (!selectedProp.snapToGrid) {
                    propOffsetX = Math.floor(Math.random() * 24) - 12;
                    propOffsetY = Math.floor(Math.random() * 24) - 12;
                  }

                  newTiles.push({
                    x,
                    y,
                    imageUrl: selectedProp.url,
                    type: 'object',
                    isSpritesheet: selectedProp.isSpritesheet,
                    frameCount: selectedProp.frameCount,
                    frameWidth: selectedProp.frameWidth,
                    frameHeight: selectedProp.frameHeight,
                    animationSpeed: selectedProp.animationSpeed,
                    layer: selectedProp.layer || 2,
                    offsetX: propOffsetX,
                    offsetY: propOffsetY,
                    isWalkable: selectedProp.isWalkable ?? false,
                    snapToGrid: selectedProp.snapToGrid ?? false,
                    isAutoFill: selectedProp.isAutoFill,
                    isAutoTile: selectedProp.isAutoTile,
                    rotation: selectedProp.rotation || 0
                  });
                }
              }
            }
          }
        }
        batchAddTiles(newTiles);
      } catch (error) {
        console.error("Auto-fill failed", error);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  return { handleAutoFill, isGenerating, seed, setSeed };
};
