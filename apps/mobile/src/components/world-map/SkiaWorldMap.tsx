import React, { useMemo, useEffect } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import { Canvas, Group, Fill, Rect as SkiaRect, useClock } from '@shopify/react-native-skia';
import Reanimated, { useSharedValue, useDerivedValue, withTiming, withRepeat, Easing, useAnimatedStyle, withSpring, useFrameCallback, runOnJS } from 'react-native-reanimated';
import { useSkiaAssets } from './useSkiaAssets';
import { SkiaTile } from './SkiaTile';
import { useTileLibrary } from '../../contexts/TileContext';

interface SkiaWorldMapProps {
  visionGrid: any[];
  mapSettings: any;
  user: any;
  tileSize: number;
  showWalkabilityOverlay?: boolean;
  children?: React.ReactNode; 
  overlayChildren?: React.ReactNode;
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
  visionGrid, mapSettings, user, tileSize, showWalkabilityOverlay, children, overlayChildren,
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

    (visionGrid || []).forEach(cell => {
      if (!cell) return;
      cell.tiles?.forEach((tile: any) => {
        if (tile.imageUrl) urls.add(tile.imageUrl);
      });
    });
    return Array.from(urls);
  }, [visionGrid, mapSettings]);

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

  // Snap to user position when it changes via React (teleport/fast travel)
  useEffect(() => {
    if (velocityX.value === 0 && velocityY.value === 0) {
      mapLeft.value = -(user?.world_x || 0) * tileSize - (tileSize / 2);
      mapTop.value = -(user?.world_y || 0) * tileSize - (tileSize / 2);
    }
  }, [user?.world_x, user?.world_y, tileSize]);

  // Track current tile to trigger logic
  const lastTileX = useSharedValue(user?.world_x || 0);
  const lastTileY = useSharedValue(user?.world_y || 0);

  useFrameCallback((frameInfo) => {
    'worklet';
    if (!frameInfo.timeSincePreviousFrame) return;
    if (velocityX.value === 0 && velocityY.value === 0) return;

    const dt = frameInfo.timeSincePreviousFrame / 1000;
    const speed = (isSprinting.value ? SPRINT_SPEED : WALK_SPEED) * tileSize;

    // Proposed movement
    const dx = velocityX.value * speed * dt;
    const dy = velocityY.value * speed * dt;

    // Update positions
    mapLeft.value -= dx;
    mapTop.value -= dy;

    // Calculate current logical tile
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

  const transform = useDerivedValue(() => [
    { translateX: mapLeft.value + (width / 2) },
    { translateY: mapTop.value + (height / 2) }
  ]);

  const transformStyle = useAnimatedStyle(() => ({
    transform: transform.value,
  }));

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
      {/* BACKGROUND CANVAS: Ground & Props Behind Player */}
      <Canvas style={{ position: 'absolute', width, height, zIndex: 1 }} pointerEvents="none">
        {/* Background fill prevents black flash when tiles are loading or at canvas edges */}
        <Fill color="#1a1c0e" />
        <Group transform={transform}>
          {/* Layer -1: Water (Always at the very bottom) */}
          {layerMinus1Tiles.map((tile) => (
            <SkiaTile
              key={`tile-${tile.id || (tile.absX + ',' + tile.absY + ',' + (tile.layer || -1) + ',' + tile.index)}`}
              tile={tile} absPx={tile.absX * tileSize} absPy={tile.absY * tileSize}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={false}
              dictionaryData={tileLibrary.get(tile.cleanUrl)}
            />
          ))}
          {/* Layer 0: Ground/Dirt/Grass */}
          {layer0Tiles.map((tile) => (
            <SkiaTile
              key={`tile-${tile.id || (tile.absX + ',' + tile.absY + ',' + (tile.layer || 0) + ',' + tile.index)}`}
              tile={tile} absPx={tile.absX * tileSize} absPy={tile.absY * tileSize}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={false}
              dictionaryData={tileLibrary.get(tile.cleanUrl)}
            />
          ))}
          {/* Props: all Y-sorted in one pass — no canvas-swap jitter on player move */}
          {allProps.map((tile) => (
            <SkiaTile
              key={`tile-${tile.id || (tile.absX + ',' + tile.absY + ',' + (tile.layer || 1) + ',' + tile.index)}`}
              tile={tile} absPx={tile.absX * tileSize} absPy={tile.absY * tileSize}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={true}
              dictionaryData={tileLibrary.get(tile.cleanUrl)}
            />
          ))}

          {/* WALKABILITY OVERLAY: Blocked Cells & Directional Edge Blocks */}
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

      {/* REACT NATIVE LAYER: Player, Party, Nodes */}
      {/* We use Reanimated.View with the SAME transform as the Canvas for pixel-perfect sync */}
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

      {/* OVERLAY LAYER: Fixed UI elements like the Player Avatar */}
      <View 
        style={[StyleSheet.absoluteFill, { zIndex: 10000 }]} 
        pointerEvents="box-none"
      >
        {overlayChildren}
      </View>

    </View>
  );
});
