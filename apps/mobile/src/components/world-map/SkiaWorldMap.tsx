import React, { useMemo, useEffect, useRef } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import { Canvas, Group, Fill, Rect as SkiaRect, useClock, Skia, Picture, FilterMode, Circle, Image as SkiaImage } from '@shopify/react-native-skia';
import Reanimated, {
  useSharedValue,
  useDerivedValue,
  withTiming,
  withRepeat,
  Easing,
  useAnimatedStyle,
  runOnJS,
  SharedValue,
  cancelAnimation,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { useSkiaAssets } from './useSkiaAssets';
import { SkiaTile } from './SkiaTile';
import { useTileLibrary } from '../../contexts/TileContext';
import { SkiaLayeredAvatar } from './SkiaLayeredAvatar';
import { SkiaPetSprite } from './SkiaPetSprite';
import { getPixiTextureCoords, getLiquidTextureCoords } from './mapUtils';

interface SkiaWorldMapProps {
  visionGrid: any[];
  nodesInVision?: any[];
  mapSettings: any;
  spawnX: number;
  spawnY: number;
  activePet?: any;
  tileSize: number;
  showWalkabilityOverlay?: boolean;
  children?: React.ReactNode;
  pendingDir: SharedValue<number>;
  activeDirection: SharedValue<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>;
  isRunning: SharedValue<boolean>;
  isMoving: SharedValue<boolean>;
  mapLeft: SharedValue<number>;
  mapTop: SharedValue<number>;
  onTileEnter?: (x: number, y: number) => void;
  playerBaseX: SharedValue<number>;
  playerBaseY: SharedValue<number>;
  facingScaleX: SharedValue<number>;
  petOffsetX: SharedValue<number>;
  petOffsetY: SharedValue<number>;
  petScaleX: SharedValue<number>;
  petZIndex: SharedValue<number>;
  avatarData: any;
}

const { width, height } = Dimensions.get('window');

// Frame-based movement: fixed px per frame (3 = walk, 6 = run). Durations in ms for reference only.
// At 60fps, 48px / 3px per frame = 16 frames. 16 * 16.67ms = 266.7ms
const WALK_DURATION = 267;
// At 60fps, 48px / 6px per frame = 8 frames. 8 * 16.67ms = 133.3ms
const RUN_DURATION = 134;

const SkiaWorldMapInternal: React.FC<SkiaWorldMapProps> = ({
  visionGrid,
  nodesInVision,
  mapSettings,
  spawnX,
  spawnY,
  activePet,
  tileSize,
  showWalkabilityOverlay,
  children,
  pendingDir,
  activeDirection,
  isRunning,
  isMoving,
  mapLeft,
  mapTop,
  onTileEnter,
  playerBaseX,
  playerBaseY,
  facingScaleX,
  petOffsetX,
  petOffsetY,
  petScaleX,
  petZIndex,
  avatarData,
}) => {
  const { tileLibrary } = useTileLibrary();

  const visibleGrid = useMemo(() => {
    if (!visionGrid || visionGrid.length === 0) return [];
    
    // Viewport Culling logic
    const BUFFER_X = 8;
    const BUFFER_Y_TOP = 8;
    const BUFFER_Y_BOTTOM = 15;

    const screenTilesX = Math.ceil(width / tileSize);
    const screenTilesY = Math.ceil(height / tileSize);
    const halfScreenX = Math.ceil(screenTilesX / 2);
    const halfScreenY = Math.ceil(screenTilesY / 2);

    // Calculate grid center to proxy player viewport
    let minG = Infinity, maxG = -Infinity, minGY = Infinity, maxGY = -Infinity;
    for (let i = 0; i < visionGrid.length; i++) {
      const c = visionGrid[i];
      if (c.x < minG) minG = c.x;
      if (c.x > maxG) maxG = c.x;
      if (c.y < minGY) minGY = c.y;
      if (c.y > maxGY) maxGY = c.y;
    }
    const centerX = (minG + maxG) / 2;
    const centerY = (minGY + maxGY) / 2;

    const minX = centerX - halfScreenX - BUFFER_X;
    const maxX = centerX + halfScreenX + BUFFER_X;
    const minY = centerY - halfScreenY - BUFFER_Y_TOP;
    const maxY = centerY + halfScreenY + BUFFER_Y_BOTTOM;

    return visionGrid.filter(cell => 
      cell.x >= minX && cell.x <= maxX && cell.y >= minY && cell.y <= maxY
    );
  }, [visionGrid, tileSize]);

  // Extract URLs to load - optimized to avoid unnecessary Set operations
  const urlsToLoad = useMemo(() => {
    const urls = new Set<string>();
    if (mapSettings?.cleanAutotileSheetUrl) urls.add(mapSettings.cleanAutotileSheetUrl);
    if (mapSettings?.cleanDirtSheetUrl) urls.add(mapSettings.cleanDirtSheetUrl);
    if (mapSettings?.cleanWaterSheetUrl) urls.add(mapSettings.cleanWaterSheetUrl);
    if (mapSettings?.cleanFoamSheetUrl) urls.add(mapSettings.cleanFoamSheetUrl);

    const walkSheet = activePet?.pet_details?.metadata?.visuals?.walking_spritesheet;
    if (walkSheet?.url) urls.add(walkSheet.url.split('?')[0]);

    if (visibleGrid) {
      for (let i = 0; i < visibleGrid.length; i++) {
        const cell = visibleGrid[i];
        if (cell?.tiles) {
          for (let j = 0; j < cell.tiles.length; j++) {
            const t = cell.tiles[j];
            if (t.cleanUrl) urls.add(t.cleanUrl);
          }
        }
      }
    }

    if (nodesInVision) {
      for (let i = 0; i < nodesInVision.length; i++) {
        const url = nodesInVision[i].icon_url;
        if (url) urls.add(url.split('?')[0]);
      }
    }
    return Array.from(urls);
  }, [visibleGrid, mapSettings, activePet, nodesInVision]);

  const images = useSkiaAssets(urlsToLoad);

  // Animation values
  const clockMs = useClock();
  const animationFrame = useDerivedValue(() => clockMs.value / 1000);

  const foamOpacity = useSharedValue(0.6);
  useEffect(() => {
    foamOpacity.value = withRepeat(
      withTiming(0.9, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  // --- GRID-LOCKED MOVEMENT ENGINE ---
  const currentTileX = useSharedValue(spawnX);
  const currentTileY = useSharedValue(spawnY);
  const targetX = useSharedValue(spawnX);
  const targetY = useSharedValue(spawnY);

  const prevReactX = useRef(spawnX);
  const prevReactY = useRef(spawnY);

  const lastEnteredTileX = useSharedValue(-999);
  const lastEnteredTileY = useSharedValue(-999);

  useEffect(() => {
    const ux = spawnX;
    const uy = spawnY;
    const dx = Math.abs(ux - prevReactX.current);
    const dy = Math.abs(uy - prevReactY.current);

    if (dx >= 5 || dy >= 5) {
      isMoving.value = false;
      cancelAnimation(mapLeft);
      cancelAnimation(mapTop);
      mapLeft.value = -ux * tileSize - (tileSize / 2);
      mapTop.value = -uy * tileSize - (tileSize / 2);
      currentTileX.value = ux;
      currentTileY.value = uy;
      targetX.value = ux;
      targetY.value = uy;
      lastEnteredTileX.value = ux;
      lastEnteredTileY.value = uy;
    }

    prevReactX.current = ux;
    prevReactY.current = uy;
  }, [spawnX, spawnY, tileSize]);

  // Collision data
  const collisionDataRef = useSharedValue<{[key: string]: {isWalkable: boolean; edgeBlocks: number}}>({});

  const handleTileEnter = React.useCallback((tx: number, ty: number) => {
    if (onTileEnter) {
      onTileEnter(tx, ty);
    }
  }, [onTileEnter]);

  const checkTileEnter = (tx: number, ty: number) => {
    'worklet';
    if (tx !== lastEnteredTileX.value || ty !== lastEnteredTileY.value) {
      lastEnteredTileX.value = tx;
      lastEnteredTileY.value = ty;
      runOnJS(handleTileEnter)(tx, ty);
    }
  };

  const moveNext = () => {
    'worklet';
    const dirStr = activeDirection.value;
    if (!dirStr) {
      return;
    }

    let nx = currentTileX.value;
    let ny = currentTileY.value;

    if (dirStr === 'UP') ny -= 1;
    else if (dirStr === 'DOWN') ny += 1;
    else if (dirStr === 'LEFT') nx -= 1;
    else if (dirStr === 'RIGHT') nx += 1;

    const collisionData = collisionDataRef.value;
    const targetCol = collisionData[`${nx},${ny}`];
    
    // 1. Check Full Block
    if (targetCol && !targetCol.isWalkable) {
      return;
    }

    // 2. Check Edge Block
    const curCol = collisionData[`${currentTileX.value},${currentTileY.value}`];
    const currentEdgeBlocks = curCol?.edgeBlocks ?? 0;
    const destEdgeBlocks = targetCol?.edgeBlocks ?? 0;

    const blockedByEdge =
      (dirStr === 'UP'    && ((currentEdgeBlocks & 1) || (destEdgeBlocks & 4))) ||
      (dirStr === 'DOWN'  && ((currentEdgeBlocks & 4) || (destEdgeBlocks & 1))) ||
      (dirStr === 'RIGHT' && ((currentEdgeBlocks & 2) || (destEdgeBlocks & 8))) ||
      (dirStr === 'LEFT'  && ((currentEdgeBlocks & 8) || (destEdgeBlocks & 2)));

    if (blockedByEdge) {
      return;
    }

    targetX.value = nx;
    targetY.value = ny;
    isMoving.value = true;

    const targetPixelX = -nx * tileSize - (tileSize / 2);
    const targetPixelY = -ny * tileSize - (tileSize / 2);
    const duration = isRunning.value ? RUN_DURATION : WALK_DURATION;

    if (nx !== currentTileX.value) {
      mapLeft.value = withTiming(targetPixelX, { duration, easing: Easing.linear }, (finished) => {
        if (finished) {
          currentTileX.value = nx;
          checkTileEnter(nx, ny);
          isMoving.value = false;
        }
      });
    } else if (ny !== currentTileY.value) {
      mapTop.value = withTiming(targetPixelY, { duration, easing: Easing.linear }, (finished) => {
        if (finished) {
          currentTileY.value = ny;
          checkTileEnter(nx, ny);
          isMoving.value = false;
        }
      });
    }
  };

  useAnimatedReaction(
    () => ({
      dir: activeDirection.value,
      moving: isMoving.value
    }),
    (state, prevState) => {
      if (state.dir !== null && state.moving === false) {
        if (prevState?.moving === true || prevState?.dir !== state.dir) {
          moveNext();
        }
      }
    }
  );

  // Pre-calculate centered offsets to prevent half-pixel blurring on odd-resolution screens (e.g., iPhone 15 width is 393)
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  // Snap to integers (Math.round) to eliminate sub-pixel jitter
  const transform = useDerivedValue(() => [
    { translateX: Math.round(mapLeft.value + centerX) },
    { translateY: Math.round(mapTop.value + centerY) }
  ]);

  const transformStyle = useAnimatedStyle(() => ({
    transform: transform.value,
  }));

  // Build collision lookup from visibleGrid
  const collisionMap = useMemo(() => {
    const map = new Map<string, { isWalkable: boolean; edgeBlocks: number }>();
    (visibleGrid || []).forEach(cell => {
      if (!cell) return;
      const key = `${cell.x},${cell.y}`;
      const hasBlockedTile = cell.tiles?.some((t: any) => 
        t.isWalkable === false || t.is_walk_able === false || t.is_walkable === false
      );
      const edgeBlocks = cell.tiles?.reduce((acc: number, t: any) => {
        const bits = Number(t.edgeBlocks ?? t.edge_blocks ?? t.edge_mask ?? t.edgeMask ?? 0);
        return acc | bits;
      }, 0) || 0;
      map.set(key, { isWalkable: !hasBlockedTile, edgeBlocks });
    });
    return map;
  }, [visibleGrid]);

  // Sync collision data to shared value for UI-thread access
  useEffect(() => {
    const collisionObj: {[key: string]: {isWalkable: boolean; edgeBlocks: number}} = {};
    collisionMap.forEach((value, key) => {
      collisionObj[key] = value;
    });
    collisionDataRef.value = collisionObj;
  }, [collisionMap]);

  // Extract layers and sort ALL tiles by zIndex (single pass)
  const sortedTiles = useMemo(() => {
    const all: any[] = [];

    if (visibleGrid) {
      for (let i = 0; i < visibleGrid.length; i++) {
        const cell = visibleGrid[i];
        if (!cell?.tiles) continue;

        for (let j = 0; j < cell.tiles.length; j++) {
          const t = cell.tiles[j];
          if (!t) continue;

          const cleanUrl = t.cleanUrl;
          const dictData = cleanUrl ? tileLibrary.get(cleanUrl) : null;

          // Compute Z-Index logic to match PixiMapCanvas
          const tileLayer = t.layer || 0;
          
          // Z-Index calculation: (layer * 100000) + (y + offsetY/TILE_SIZE)
          // This ensures higher layers are always on top, and same-layer tiles are Y-sorted.
          const zIndex = (tileLayer * 100000) + (cell.y + (t.offsetY || 0) / tileSize);

          all.push([t, cell.x, cell.y, j, cleanUrl, dictData, zIndex, tileLayer]);
        }
      }
    }

    // Sort by zIndex
    all.sort((a, b) => a[6] - b[6]);

    return all;
  }, [visibleGrid, tileSize, tileLibrary]);

  const allVisibleTiles = sortedTiles;

  const spritesheet = activePet?.pet_details?.metadata?.visuals?.walking_spritesheet;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas style={{ position: 'absolute', width, height, zIndex: 1 }} pointerEvents="none">
        <Fill color="#1a1c0e" />
        <Group transform={transform}>
          {allVisibleTiles.map((e) => (
            <SkiaTile
              key={`tile-${e[0].id || (e[1] + ',' + e[2] + ',' + e[7] + ',' + e[3])}`}
              tile={e[0]}
              absPx={e[1] * tileSize}
              absPy={e[2] * tileSize}
              tileSize={tileSize}
              images={images}
              mapSettings={mapSettings}
              animationFrame={animationFrame}
              foamOpacity={foamOpacity}
              isProp={e[7] > 0}
              dictionaryData={e[5]}
            />
          ))}
          {/* Pet moved to overlay layer to prevent clipping by player avatar */}
          {showWalkabilityOverlay && (visibleGrid || []).map(cell => {
            if (!cell) return null;
            const blockedTiles = cell.tiles?.filter((t: any) => (t.isWalkable === false || t.is_walk_able === false || t.is_walkable === false));
            const edgeTiles = cell.tiles?.filter((t: any) => {
              const bits = Number(t.edgeBlocks ?? t.edge_blocks ?? t.edge_mask ?? t.edgeMask ?? 0);
              return bits > 0;
            });
            
            const cellX = cell.x * tileSize;
            const cellY = cell.y * tileSize;
            const BAR = 5 * (tileSize / 48);

            return (
              <Group key={`walk-overlay-${cell.x}-${cell.y}`}>
                {blockedTiles?.length > 0 && (
                  <SkiaRect x={cellX} y={cellY} width={tileSize} height={tileSize} color="rgba(220, 38, 38, 0.35)" />
                )}
                {edgeTiles?.map((t: any, i: number) => {
                  const bits = Number(t.edgeBlocks ?? t.edge_blocks ?? t.edge_mask ?? t.edgeMask ?? 0);
                  return (
                    <Group key={`edge-bits-${cell.x}-${cell.y}-${i}`}>
                      {(bits & 1) && <SkiaRect x={cellX} y={cellY} width={tileSize} height={BAR} color="rgba(249, 115, 22, 0.85)" />}
                      {(bits & 2) && <SkiaRect x={cellX + tileSize - BAR} y={cellY} width={BAR} height={tileSize} color="rgba(249, 115, 22, 0.85)" />}
                      {(bits & 4) && <SkiaRect x={cellX} y={cellY + tileSize - BAR} width={tileSize} height={BAR} color="rgba(249, 115, 22, 0.85)" />}
                      {(bits & 8) && <SkiaRect x={cellX} y={cellY} width={BAR} height={tileSize} color="rgba(249, 115, 22, 0.85)" />}
                    </Group>
                  );
                })}
              </Group>
            );
          })}

          {/* NATIVE SKIA NODE RENDERING (Zero Shaking!) */}
          {nodesInVision?.map((node) => {
            // 1. Get the pre-loaded image from Supabase
            const cleanUrl = node.icon_url?.split('?')[0];
            const img = cleanUrl ? images.get(cleanUrl) : null;
            
            // 2. Calculate exact pixel-perfect positions
            const nodeX = Math.round(node.x * tileSize);
            const nodeY = Math.round(node.y * tileSize);
            const centerX = Math.round(nodeX + tileSize / 2);
            const centerY = Math.round(nodeY + tileSize / 2);
            const radius = Math.round(tileSize * 0.45); 
            const tokenSize = radius * 2;

            return (
              <Group 
                key={`skia-node-${node.id}`}
                clip={Skia.RRectXY(Skia.XYWHRect(centerX - radius, centerY - radius, tokenSize, tokenSize), radius, radius)}
              >
                {/* The Opaque Pedestal/Background */}
                <Circle
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  color="rgba(15, 23, 42, 0.8)"
                />

                {/* The NPC Sprite - Fills the token area, clipped by the circle */}
                {img && (
                  <SkiaImage
                    image={img}
                    x={centerX - radius}
                    y={centerY - radius} 
                    width={tokenSize}
                    height={tokenSize}
                    fit="contain"
                    sampling={{ filter: FilterMode.Nearest }}
                  />
                )}
                
                {/* The Bright Blue Token Border */}
                <Circle
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  color="rgba(59, 130, 246, 1.0)"
                  style="stroke"
                  strokeWidth={2}
                />
              </Group>
            );
          })}
        </Group>

        {/* NATIVE SKIA PLAYER & PET RENDERING */}
        {avatarData && (
          <SkiaLayeredAvatar
            user={avatarData}
            size={72}
            isMoving={isMoving}
            activeDirection={activeDirection}
            x={playerBaseX}
            y={playerBaseY}
          />
        )}
        
        {spritesheet && (
          <SkiaPetSprite
            imageUrl={spritesheet.url}
            isMoving={isMoving}
            activeDirection={activeDirection}
            flipX={false}
            scale={0.15 * (tileSize / 48)}
            totalFrames={spritesheet.frame_count ?? 1}
            totalTimeMs={spritesheet.duration_ms ?? 1000}
            frameWidth={spritesheet.frame_width ?? 64}
            frameHeight={spritesheet.frame_height ?? 64}
            idleIndex={spritesheet.idle_frame ?? 0}
            x={width / 2} // RAW CENTER POINT
            y={(height / 2) + 26} // Increased from +20 to lower base position
            trailX={petOffsetX}
            trailY={petOffsetY}
          />
        )}
      </Canvas>

      <Reanimated.View 
        style={[
          StyleSheet.absoluteFill, 
          { zIndex: 100 }, 
          transformStyle
        ]} 
        pointerEvents="box-none"
      >
        {children}
      </Reanimated.View>
    </View>
  );
};

export const SkiaWorldMap = React.memo(SkiaWorldMapInternal, (prev, next) => {
  if (prev.visionGrid !== next.visionGrid) return false;
  const dx = Math.abs(next.spawnX - prev.spawnX);
  const dy = Math.abs(next.spawnY - prev.spawnY);
  if (dx >= 5 || dy >= 5) return false;
  return true;
});
