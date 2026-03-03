import React, { useMemo, useEffect, useRef } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import { Canvas, Group, Fill, Rect as SkiaRect, useClock } from '@shopify/react-native-skia';
import Reanimated, {
  useSharedValue,
  useDerivedValue,
  withTiming,
  withRepeat,
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  runOnJS,
  SharedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSkiaAssets } from './useSkiaAssets';
import { SkiaTile } from './SkiaTile';
import { useTileLibrary } from '../../contexts/TileContext';

interface SkiaWorldMapProps {
  visionGrid: any[];
  mapSettings: any;
  user: any;
  activePet?: any;
  tileSize: number;
  showWalkabilityOverlay?: boolean;
  children?: React.ReactNode;
  overlayChildren?: React.ReactNode;
  petOverlay?: React.ReactNode;
  pendingDir: SharedValue<number>;
  activeDirection: SharedValue<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>;
  isRunning: SharedValue<boolean>;
  isMoving: SharedValue<boolean>;
  mapLeft: SharedValue<number>;
  mapTop: SharedValue<number>;
  onTileEnter?: (x: number, y: number) => void;
}

const { width, height } = Dimensions.get('window');

// Frame-based movement: fixed px per frame (3 = walk, 6 = run). Durations in ms for reference only.
// At 60fps, 48px / 3px per frame = 16 frames. 16 * 16.67ms = 266.7ms
const WALK_DURATION = 267;
// At 60fps, 48px / 6px per frame = 8 frames. 8 * 16.67ms = 133.3ms
const RUN_DURATION = 134;

export const SkiaWorldMap: React.FC<SkiaWorldMapProps> = React.memo(
  ({
    visionGrid,
    mapSettings,
    user,
    activePet,
    tileSize,
    showWalkabilityOverlay,
    children,
    overlayChildren,
    petOverlay,
    pendingDir,
    activeDirection,
    isRunning,
    isMoving,
    mapLeft,
    mapTop,
    onTileEnter,
  }) => {
  const { tileLibrary } = useTileLibrary();

  // Extract URLs to load - optimized to avoid unnecessary Set operations
  const urlsToLoad = useMemo(() => {
    const urls = new Set<string>();
    if (mapSettings?.autotile_sheet_url) urls.add(mapSettings.autotile_sheet_url.split('?')[0]);
    if (mapSettings?.dirt_sheet_url) urls.add(mapSettings.dirt_sheet_url.split('?')[0]);
    if (mapSettings?.water_sheet_url) urls.add(mapSettings.water_sheet_url.split('?')[0]);
    if (mapSettings?.foam_sheet_url) urls.add(mapSettings.foam_sheet_url.split('?')[0]);

    const walkSheet = activePet?.pet_details?.metadata?.visuals?.walking_spritesheet;
    if (walkSheet?.url) urls.add(walkSheet.url.split('?')[0]);

    if (visionGrid) {
      for (let i = 0; i < visionGrid.length; i++) {
        const cell = visionGrid[i];
        if (cell?.tiles) {
          for (let j = 0; j < cell.tiles.length; j++) {
            const t = cell.tiles[j];
            if (t.imageUrl) urls.add(t.imageUrl.split('?')[0]);
          }
        }
      }
    }
    return Array.from(urls);
  }, [visionGrid, mapSettings, activePet]);

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
  
  // Current logical tile position
  const currentTileX = useSharedValue(user?.world_x || 0);
  const currentTileY = useSharedValue(user?.world_y || 0);

  // Target tile for delta-time movement (synced on teleport)
  const targetX = useSharedValue(user?.world_x || 0);
  const targetY = useSharedValue(user?.world_y || 0);

  // 1. Restore the React-state history refs
  const prevReactX = useRef(user?.world_x || 0);
  const prevReactY = useRef(user?.world_y || 0);

  // 2. Safely check for massive jumps in the database/context
  useEffect(() => {
    const ux = user?.world_x || 0;
    const uy = user?.world_y || 0;

    const dx = Math.abs(ux - prevReactX.current);
    const dy = Math.abs(uy - prevReactY.current);

    if (dx >= 5 || dy >= 5) {
      isMoving.value = false;
      mapLeft.value = -ux * tileSize - (tileSize / 2);
      mapTop.value = -uy * tileSize - (tileSize / 2);
      currentTileX.value = ux;
      currentTileY.value = uy;
      targetX.value = ux;
      targetY.value = uy;
    }

    prevReactX.current = ux;
    prevReactY.current = uy;
  }, [user?.world_x, user?.world_y, tileSize]);

  // Collision data
  const collisionDataRef = useSharedValue<{[key: string]: {isWalkable: boolean; edgeBlocks: number}}>({});

  // --- DELTA-TIME CONTINUOUS GAME LOOP ---
  // Replaces withTiming to prevent 1-frame stutters between grid steps
  useFrameCallback((frameInfo) => {
    'worklet';
    const rawDt = frameInfo.timeSincePreviousFrame;
    if (rawDt === null) return;

    // Cap dt to 33ms (approx 30fps drop).
    // This prevents the camera from violently jumping if the phone lags.
    const dt = Math.min(rawDt, 33);

    if (!isMoving.value) {
      const dirStr = activeDirection.value;
      if (!dirStr) return;

      let nx = currentTileX.value;
      let ny = currentTileY.value;

      if (dirStr === 'UP') ny -= 1;
      else if (dirStr === 'DOWN') ny += 1;
      else if (dirStr === 'LEFT') nx -= 1;
      else if (dirStr === 'RIGHT') nx += 1;

      const collisionData = collisionDataRef.value;
      const targetCol = collisionData[`${nx},${ny}`];
      if (targetCol && !targetCol.isWalkable) return;

      const curCol = collisionData[`${currentTileX.value},${currentTileY.value}`];
      if (curCol && curCol.edgeBlocks) {
        const dirNum = dirStr === 'UP' ? 1 : dirStr === 'DOWN' ? 2 : dirStr === 'LEFT' ? 3 : 4;
        if (dirNum === 1 && (curCol.edgeBlocks & 1)) return;
        if (dirNum === 4 && (curCol.edgeBlocks & 2)) return;
        if (dirNum === 2 && (curCol.edgeBlocks & 4)) return;
        if (dirNum === 3 && (curCol.edgeBlocks & 8)) return;
      }

      targetX.value = nx;
      targetY.value = ny;
      isMoving.value = true;
    }

    if (isMoving.value) {
      // Convert fixed pixels to time-based speed (Pixels per millisecond)
      // 3px at 60fps (16.6ms) = ~0.18px/ms
      // 6px at 60fps (16.6ms) = ~0.36px/ms
      const speed = isRunning.value ? 0.36 : 0.18;
      const stepDistance = speed * dt;

      const targetPixelX = -targetX.value * tileSize - (tileSize / 2);
      const targetPixelY = -targetY.value * tileSize - (tileSize / 2);

      let reachedX = false;
      let reachedY = false;

      if (mapLeft.value < targetPixelX) {
        mapLeft.value = Math.min(mapLeft.value + stepDistance, targetPixelX);
      } else if (mapLeft.value > targetPixelX) {
        mapLeft.value = Math.max(mapLeft.value - stepDistance, targetPixelX);
      }
      if (Math.abs(mapLeft.value - targetPixelX) < 0.1) {
        mapLeft.value = targetPixelX;
        reachedX = true;
      }

      if (mapTop.value < targetPixelY) {
        mapTop.value = Math.min(mapTop.value + stepDistance, targetPixelY);
      } else if (mapTop.value > targetPixelY) {
        mapTop.value = Math.max(mapTop.value - stepDistance, targetPixelY);
      }
      if (Math.abs(mapTop.value - targetPixelY) < 0.1) {
        mapTop.value = targetPixelY;
        reachedY = true;
      }

      if (reachedX && reachedY) {
        currentTileX.value = targetX.value;
        currentTileY.value = targetY.value;

        if (onTileEnter) runOnJS(onTileEnter)(targetX.value, targetY.value);

        const dirStr = activeDirection.value;
        if (dirStr) {
          let nx = currentTileX.value;
          let ny = currentTileY.value;
          if (dirStr === 'UP') ny -= 1;
          else if (dirStr === 'DOWN') ny += 1;
          else if (dirStr === 'LEFT') nx -= 1;
          else if (dirStr === 'RIGHT') nx += 1;

          const collisionData = collisionDataRef.value;
          const targetCol = collisionData[`${nx},${ny}`];

          if (!targetCol || targetCol.isWalkable) {
            targetX.value = nx;
            targetY.value = ny;
            return;
          }
        }

        isMoving.value = false;
      }
    }
  });

  // Pre-calculate centered offsets to prevent half-pixel blurring on odd-resolution screens (e.g., iPhone 15 width is 393)
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  // Feed the raw, continuous floating-point values straight to Skia
  const transform = useDerivedValue(() => [
    { translateX: mapLeft.value + centerX },
    { translateY: mapTop.value + centerY }
  ]);

  const transformStyle = useAnimatedStyle(() => ({
    transform: transform.value,
  }));

  // Build collision lookup from visionGrid
  const collisionMap = useMemo(() => {
    const map = new Map<string, { isWalkable: boolean; edgeBlocks: number }>();
    (visionGrid || []).forEach(cell => {
      if (!cell) return;
      const key = `${cell.x},${cell.y}`;
      const hasBlockedTile = cell.tiles?.some((t: any) => 
        t.isWalkable === false || t.is_walk_able === false || t.is_walkable === false
      );
      const edgeBlocks = cell.tiles?.reduce((acc: number, t: any) => 
        acc | (t.edgeBlocks || 0), 0
      ) || 0;
      map.set(key, { isWalkable: !hasBlockedTile, edgeBlocks });
    });
    return map;
  }, [visionGrid]);

  // Sync collision data to shared value for UI-thread access
  useEffect(() => {
    const collisionObj: {[key: string]: {isWalkable: boolean; edgeBlocks: number}} = {};
    collisionMap.forEach((value, key) => {
      collisionObj[key] = value;
    });
    collisionDataRef.value = collisionObj;
  }, [collisionMap]);

  // Extract layers and sort props by zIndex (single pass)
  const sortedLayers = useMemo(() => {
    const lMinus1: any[] = [];
    const l0: any[] = [];
    const props: any[] = [];

    if (visionGrid) {
      for (let i = 0; i < visionGrid.length; i++) {
        const cell = visionGrid[i];
        if (!cell?.tiles) continue;

        for (let j = 0; j < cell.tiles.length; j++) {
          const t = cell.tiles[j];
          // Skip invisible collision/edge-block layers — they carry walkability data only
          const rawLayer = (t.layer !== undefined && t.layer !== null) ? Number(t.layer) : 0;
          if (rawLayer <= -2) continue;

          const cleanUrl = t.imageUrl?.split('?')[0];
          const dictData = cleanUrl ? tileLibrary.get(cleanUrl) : null;

          // Determine logical layer. Priority: Chunk Data -> Dictionary Data -> Default 0
          let tileLayer = rawLayer !== 0 ? rawLayer : (isNaN(Number(dictData?.layer)) ? 0 : Number(dictData?.layer));
          const isWater = (t.type === 'water') || (dictData?.type === 'water') || (dictData?.category === 'water_base');

          if (tileLayer < 0 || isWater) {
            // Push flat array [tile, absX, absY, index, cleanUrl, dictData]
            lMinus1.push([t, cell.x, cell.y, j, cleanUrl, dictData]);
          } else if (tileLayer === 0) {
            l0.push([t, cell.x, cell.y, j, cleanUrl, dictData]);
          } else {
            // Y-sort props by their visual bottom edge
            const frameHeight = dictData?.frame_height ?? t.frameHeight ?? t.frame_height ?? 48;
            const displayHeight = frameHeight * (tileSize / 48);
            const finalTop = cell.y * tileSize - (displayHeight - tileSize) + (t.offsetY || 0);
            const zIndex = (tileLayer + 10) * 100 + Math.floor(finalTop + displayHeight);
            // [tile, absX, absY, index, cleanUrl, dictData, zIndex]
            props.push([t, cell.x, cell.y, j, cleanUrl, dictData, zIndex]);
          }
        }
      }
    }

    // Sort the flat arrays by the 6th index (zIndex)
    props.sort((a, b) => a[6] - b[6]);

    return { layerMinus1Tiles: lMinus1, layer0Tiles: l0, allProps: props };
  }, [visionGrid, tileSize, tileLibrary]);

  const { layerMinus1Tiles, layer0Tiles, allProps } = sortedLayers;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas style={{ position: 'absolute', width, height, zIndex: 1 }} pointerEvents="none">
        <Fill color="#1a1c0e" />
        <Group transform={transform}>
          {layerMinus1Tiles.map((e) => (
            <SkiaTile
              key={`tile-${e[0].id || (e[1] + ',' + e[2] + ',' + (e[0].layer || -1) + ',' + e[3])}`}
              tile={e[0]}
              absPx={e[1] * tileSize}
              absPy={e[2] * tileSize}
              tileSize={tileSize}
              images={images}
              mapSettings={mapSettings}
              animationFrame={animationFrame}
              foamOpacity={foamOpacity}
              isProp={false}
              dictionaryData={e[5]}
            />
          ))}
          {layer0Tiles.map((e) => (
            <SkiaTile
              key={`tile-${e[0].id || (e[1] + ',' + e[2] + ',' + (e[0].layer || 0) + ',' + e[3])}`}
              tile={e[0]}
              absPx={e[1] * tileSize}
              absPy={e[2] * tileSize}
              tileSize={tileSize}
              images={images}
              mapSettings={mapSettings}
              animationFrame={animationFrame}
              foamOpacity={foamOpacity}
              isProp={false}
              dictionaryData={e[5]}
            />
          ))}
          {allProps.map((e) => (
            <SkiaTile
              key={`tile-${e[0].id || (e[1] + ',' + e[2] + ',' + (e[0].layer || 1) + ',' + e[3])}`}
              tile={e[0]}
              absPx={e[1] * tileSize}
              absPy={e[2] * tileSize}
              tileSize={tileSize}
              images={images}
              mapSettings={mapSettings}
              animationFrame={animationFrame}
              foamOpacity={foamOpacity}
              isProp={true}
              dictionaryData={e[5]}
            />
          ))}
          {/* Pet moved to overlay layer to prevent clipping by player avatar */}
          {showWalkabilityOverlay && (visionGrid || []).map(cell => {
            if (!cell) return null;
            const blockedTiles = cell.tiles?.filter((t: any) => (t.isWalkable === false || t.is_walk_able === false || t.is_walkable === false));
            const edgeTiles = cell.tiles?.filter((t: any) => t.edgeBlocks !== undefined && t.edgeBlocks > 0);
            
            const cellX = cell.x * tileSize;
            const cellY = cell.y * tileSize;
            const BAR = 5 * (tileSize / 48);

            return (
              <Group key={`walk-overlay-${cell.x}-${cell.y}`}>
                {blockedTiles?.length > 0 && (
                  <SkiaRect x={cellX} y={cellY} width={tileSize} height={tileSize} color="rgba(220, 38, 38, 0.35)" />
                )}
                {edgeTiles?.map((t: any, i: number) => {
                  const bits = t.edgeBlocks;
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
        </Group>
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
      <View 
        style={[StyleSheet.absoluteFill, { zIndex: 10000 }]} 
        pointerEvents="box-none"
      >
        {overlayChildren}
        {petOverlay}
      </View>

    </View>
  );
}, (prev, next) => {
  if (prev.visionGrid !== next.visionGrid) return false;
  if (prev.showWalkabilityOverlay !== next.showWalkabilityOverlay) return false;
  if (prev.mapSettings !== next.mapSettings) return false;
  if (prev.activePet?.id !== next.activePet?.id) return false;

  // CRITICAL: Only re-render the map if the user TELEPORTS (dx >= 5).
  // Ignore small 1-tile movements and steps_banked updates to prevent mid-step stutter.
  const prevX = prev.user?.world_x ?? 0;
  const prevY = prev.user?.world_y ?? 0;
  const nextX = next.user?.world_x ?? 0;
  const nextY = next.user?.world_y ?? 0;
  const dx = Math.abs(nextX - prevX);
  const dy = Math.abs(nextY - prevY);

  if (dx >= 5 || dy >= 5) return false; // Trigger re-render for teleport snapping

  return true; // Ignore all other updates
});
