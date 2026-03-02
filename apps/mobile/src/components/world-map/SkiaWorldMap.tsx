import React, { useMemo, useEffect, useRef } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import { Canvas, Group, Fill, Rect as SkiaRect, useClock } from '@shopify/react-native-skia';
import Reanimated, { useSharedValue, useDerivedValue, withTiming, withRepeat, Easing, useAnimatedStyle, useFrameCallback, runOnJS } from 'react-native-reanimated';
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
  velocityX: Reanimated.SharedValue<number>;
  velocityY: Reanimated.SharedValue<number>;
  isSprinting: Reanimated.SharedValue<boolean>;
  onTileEnter?: (x: number, y: number) => void;
}

const { width, height } = Dimensions.get('window');

// SPEED: 4 tiles/sec for walk, 8 tiles/sec for sprint
const WALK_SPEED = 4;
const SPRINT_SPEED = 8;

export const SkiaWorldMap: React.FC<SkiaWorldMapProps> = React.memo(({ 
  visionGrid, mapSettings, user, activePet, tileSize, showWalkabilityOverlay, children, overlayChildren, petOverlay,
  velocityX, velocityY, isSprinting, onTileEnter
}) => {
  const { tileLibrary } = useTileLibrary();

  // Extract URLs to load
  const urlsToLoad = useMemo(() => {
    const urls = new Set<string>();
    if (mapSettings?.autotile_sheet_url) urls.add(mapSettings.autotile_sheet_url);
    if (mapSettings?.dirt_sheet_url) urls.add(mapSettings.dirt_sheet_url);
    if (mapSettings?.water_sheet_url) urls.add(mapSettings.water_sheet_url);
    if (mapSettings?.foam_sheet_url) urls.add(mapSettings.foam_sheet_url);

    // Add pet URL if it exists
    const walkSheet = activePet?.pet_details?.metadata?.visuals?.walking_spritesheet;
    if (walkSheet?.url) urls.add(walkSheet.url);

    (visionGrid || []).forEach(cell => {
      if (!cell) return;
      cell.tiles?.forEach((tile: any) => {
        if (tile.imageUrl) urls.add(tile.imageUrl);
      });
    });
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

  // --- VELOCITY-DRIVEN ENGINE ---
  
  // Initial positions centered on user
  const mapLeft = useSharedValue(-(user?.world_x || 0) * tileSize - (tileSize / 2));
  const mapTop = useSharedValue(-(user?.world_y || 0) * tileSize - (tileSize / 2));

  // Teleport-only snap
  const prevUserX = useRef(user?.world_x || 0);
  const prevUserY = useRef(user?.world_y || 0);

  useEffect(() => {
    const ux = user?.world_x || 0;
    const uy = user?.world_y || 0;
    const dx = Math.abs(ux - prevUserX.current);
    const dy = Math.abs(uy - prevUserY.current);

    if (dx >= 2 || dy >= 2) {
      mapLeft.value = -ux * tileSize - (tileSize / 2);
      mapTop.value = -uy * tileSize - (tileSize / 2);
    }

    prevUserX.current = ux;
    prevUserY.current = uy;
  }, [user?.world_x, user?.world_y, tileSize]);

  // Track current tile to trigger logic
  const lastTileX = useSharedValue(user?.world_x || 0);
  const lastTileY = useSharedValue(user?.world_y || 0);

  // Collision data -- MUST be declared before useFrameCallback so the worklet
  // closure captures an initialized shared value (avoids temporal dead zone crash).
  const collisionDataRef = useSharedValue<{[key: string]: {isWalkable: boolean; edgeBlocks: number}}>({});

  // Cache the last-checked collision result so we only read the large shared
  // value object on tile transitions, not every frame (60fps).
  const lastCheckedTileX = useSharedValue(-99999);
  const lastCheckedTileY = useSharedValue(-99999);
  const lastCheckAllowX = useSharedValue(true);
  const lastCheckAllowY = useSharedValue(true);

  useFrameCallback((frameInfo) => {
    'worklet';
    if (!frameInfo.timeSincePreviousFrame) return;

    const vx = velocityX.value;
    const vy = velocityY.value;
    if (vx === 0 && vy === 0) return;

    const dt = frameInfo.timeSincePreviousFrame / 1000;
    const speed = (isSprinting.value ? SPRINT_SPEED : WALK_SPEED) * tileSize;

    // Always allow movement by default
    let allowX = vx !== 0;
    let allowY = vy !== 0;

    // Only read the large collision object when we're about to enter a NEW tile
    const proposedLeft = mapLeft.value - vx * speed * dt;
    const proposedTop  = mapTop.value  - vy * speed * dt;
    const nextX = Math.round(-(proposedLeft + tileSize / 2) / tileSize);
    const nextY = Math.round(-(proposedTop  + tileSize / 2) / tileSize);

    const tileChanged = nextX !== lastCheckedTileX.value || nextY !== lastCheckedTileY.value;

    if (tileChanged) {
      // Read collision data only on tile boundary crossing
      const collisionData = collisionDataRef.value;
      const currentX = Math.round(-(mapLeft.value + tileSize / 2) / tileSize);
      const currentY = Math.round(-(mapTop.value + tileSize / 2) / tileSize);

      // Horizontal collision
      if (allowX) {
        const hKey = `${nextX},${currentY}`;
        const hCol = collisionData[hKey];
        if (hCol && !hCol.isWalkable) allowX = false;

        const curKey = `${currentX},${currentY}`;
        const curCol = collisionData[curKey];
        if (curCol && curCol.edgeBlocks) {
          if ((vx > 0 && (curCol.edgeBlocks & 2)) || (vx < 0 && (curCol.edgeBlocks & 8))) {
            allowX = false;
          }
        }
      }

      // Vertical collision
      if (allowY) {
        const vKey = `${currentX},${nextY}`;
        const vCol = collisionData[vKey];
        if (vCol && !vCol.isWalkable) allowY = false;

        const curKey = `${currentX},${currentY}`;
        const curCol = collisionData[curKey];
        if (curCol && curCol.edgeBlocks) {
          if ((vy > 0 && (curCol.edgeBlocks & 4)) || (vy < 0 && (curCol.edgeBlocks & 1))) {
            allowY = false;
          }
        }
      }

      lastCheckedTileX.value = nextX;
      lastCheckedTileY.value = nextY;
      lastCheckAllowX.value = allowX;
      lastCheckAllowY.value = allowY;
    } else {
      // Re-use the cached collision result
      allowX = allowX && lastCheckAllowX.value;
      allowY = allowY && lastCheckAllowY.value;
    }

    if (allowX) mapLeft.value -= vx * speed * dt;
    if (allowY) mapTop.value -= vy * speed * dt;

    // Logical tile tracking for onTileEnter
    const curX = Math.round(-(mapLeft.value + tileSize / 2) / tileSize);
    const curY = Math.round(-(mapTop.value + tileSize / 2) / tileSize);

    if (curX !== lastTileX.value || curY !== lastTileY.value) {
      lastTileX.value = curX;
      lastTileY.value = curY;
      if (onTileEnter) {
        runOnJS(onTileEnter)(curX, curY);
      }
    }
  });

  // Sub-pixel smooth camera: tiles are on an integer grid relative to the
  // group, so they all shift by the same fractional amount → zero seams.
  const transform = useDerivedValue(() => [
    { translateX: mapLeft.value + (width / 2) },
    { translateY: mapTop.value + (height / 2) }
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

  // Extract layers and sort props by zIndex (single pass, no Y-split canvas swap)
  const { layerMinus1Tiles, layer0Tiles, allProps } = useMemo(() => {
    const lMinus1: any[] = [];
    const l0: any[] = [];
    const props: any[] = [];

    (visionGrid || []).forEach(cell => {
      if (!cell) return;
      cell.tiles?.forEach((t: any, index: number) => {
        // Skip invisible collision/edge-block layers — they carry walkability data only
        const rawLayer = (t.layer !== undefined && t.layer !== null) ? Number(t.layer) : 0;
        if (rawLayer <= -2) return;

        const cleanUrl = t.imageUrl?.split('?')[0];
        const enrichedTile = { 
          ...t, 
          absX: cell.x, 
          absY: cell.y, 
          index,
          cleanUrl,
          edgeBlocks: t.edgeBlocks || 0,
          isWalkable: t.isWalkable ?? t.is_walkable ?? true
        };
        const dictData = tileLibrary.get(cleanUrl);

        // Determine logical layer. Priority: Chunk Data -> Dictionary Data -> Default 0
        let tileLayer = rawLayer !== 0 ? rawLayer : (isNaN(Number(dictData?.layer)) ? 0 : Number(dictData?.layer));

        const isWater = (t.type === 'water') || (dictData?.type === 'water') || (dictData?.category === 'water_base');

        if (tileLayer < 0 || isWater) {
          lMinus1.push(enrichedTile); // Water & deep layers
        } else if (tileLayer === 0) {
          l0.push(enrichedTile);      // Ground
        } else {
          // Y-sort props by their visual bottom edge within the single background canvas
          const frameHeight = dictData?.frame_height ?? t.frameHeight ?? t.frame_height ?? 48;
          const displayHeight = frameHeight * (tileSize / 48);
          const finalTop = cell.y * tileSize - (displayHeight - tileSize) + (t.offsetY || 0);
          enrichedTile.zIndex = (tileLayer + 10) * 100 + Math.floor(finalTop + displayHeight);
          props.push(enrichedTile);
        }
      });
    });

    props.sort((a, b) => a.zIndex - b.zIndex);

    return { layerMinus1Tiles: lMinus1, layer0Tiles: l0, allProps: props };
  }, [visionGrid, tileSize, tileLibrary]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas style={{ position: 'absolute', width, height, zIndex: 1 }} pointerEvents="none">
        <Fill color="#1a1c0e" />
        <Group transform={transform}>
          {layerMinus1Tiles.map((tile) => (
            <SkiaTile
              key={`tile-${tile.id || (tile.absX + ',' + tile.absY + ',' + (tile.layer || -1) + ',' + tile.index)}`}
              tile={tile} absPx={tile.absX * tileSize} absPy={tile.absY * tileSize}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={false}
              dictionaryData={tileLibrary.get(tile.cleanUrl)}
            />
          ))}
          {layer0Tiles.map((tile) => (
            <SkiaTile
              key={`tile-${tile.id || (tile.absX + ',' + tile.absY + ',' + (tile.layer || 0) + ',' + tile.index)}`}
              tile={tile} absPx={tile.absX * tileSize} absPy={tile.absY * tileSize}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={false}
              dictionaryData={tileLibrary.get(tile.cleanUrl)}
            />
          ))}
          {allProps.map((tile) => (
            <SkiaTile
              key={`tile-${tile.id || (tile.absX + ',' + tile.absY + ',' + (tile.layer || 1) + ',' + tile.index)}`}
              tile={tile} absPx={tile.absX * tileSize} absPy={tile.absY * tileSize}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={true}
              dictionaryData={tileLibrary.get(tile.cleanUrl)}
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
});
