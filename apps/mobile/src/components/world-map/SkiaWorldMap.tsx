import React, { useMemo, useEffect } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import { Canvas, Group, Fill, Rect as SkiaRect } from '@shopify/react-native-skia';
import Reanimated, { useSharedValue, useDerivedValue, withTiming, withRepeat, Easing, useAnimatedStyle } from 'react-native-reanimated';
import { useSkiaAssets } from './useSkiaAssets';
import { SkiaTile } from './SkiaTile';
import { useTileLibrary } from '../../contexts/TileContext';

interface SkiaWorldMapProps {
  visionGrid: any[];
  mapSettings: any;
  user: any;
  tileSize: number;
  showWalkabilityOverlay?: boolean;
  children?: React.ReactNode; // For passing Player/Party/Nodes
}

const { width, height } = Dimensions.get('window');

export const SkiaWorldMap: React.FC<SkiaWorldMapProps> = React.memo(({ 
  visionGrid, mapSettings, user, tileSize, showWalkabilityOverlay, children 
}) => {
  const { tileLibrary } = useTileLibrary();

  // Extract URLs to load
  const urlsToLoad = useMemo(() => {
    const urls = new Set<string>();
    if (mapSettings?.autotile_sheet_url) urls.add(mapSettings.autotile_sheet_url);
    if (mapSettings?.dirt_sheet_url) urls.add(mapSettings.dirt_sheet_url);
    if (mapSettings?.water_sheet_url) urls.add(mapSettings.water_sheet_url);
    if (mapSettings?.foam_sheet_url) urls.add(mapSettings.foam_sheet_url);

    visionGrid.forEach(cell => {
      cell.tiles?.forEach((tile: any) => {
        if (tile.imageUrl) urls.add(tile.imageUrl);
      });
    });
    return Array.from(urls);
  }, [visionGrid, mapSettings]);

  const images = useSkiaAssets(urlsToLoad);

  // Animation values
  const animationFrame = useSharedValue(0);
  const foamOpacity = useSharedValue(0.6);

  useEffect(() => {
    // A linear ticker for spritesheets (0 to 10,000)
    // We treat the value as elapsed time in seconds.
    // Loop every ~2.7 hours (10,000 seconds) to prevent Reanimated precision issues with massive numbers.
    animationFrame.value = withRepeat(
      withTiming(10000, { duration: 10000 * 1000, easing: Easing.linear }), 
      -1, 
      false
    );

    // Foam breathing animation (0.6 to 0.9)
    foamOpacity.value = withRepeat(
      withTiming(0.9, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  // Map translation
  // The target is the negative position to center the player
  // We offset by an additional half-tile to center on the TILE itself, not the top-left vertex.
  const mapLeftTarget = -(user?.world_x || 0) * tileSize - (tileSize / 2);
  const mapTopTarget = -(user?.world_y || 0) * tileSize - (tileSize / 2);

  const mapLeft = useSharedValue(mapLeftTarget);
  const mapTop = useSharedValue(mapTopTarget);

  useEffect(() => {
    // 300ms duration with linear or gentle ease-out prevents "rubber-banding" feel.
    mapLeft.value = withTiming(mapLeftTarget, { duration: 250, easing: Easing.out(Easing.quad) });
    mapTop.value = withTiming(mapTopTarget, { duration: 250, easing: Easing.out(Easing.quad) });
  }, [mapLeftTarget, mapTopTarget, tileSize]);

  const transform = useDerivedValue(() => [
    { translateX: mapLeft.value + (width / 2) },
    { translateY: mapTop.value + (height / 2) }
  ]);

  const transformStyle = useAnimatedStyle(() => ({
    transform: transform.value,
  }));

  // Extract layers and perform Y-sorting
  const { layerMinus1Tiles, layer0Tiles, propsBelow, propsAbove } = useMemo(() => {
    const lMinus1: any[] = [];
    const l0: any[] = [];
    const pBelow: any[] = [];
    const pAbove: any[] = [];
    
    const playerY = user?.world_y || 0;

    visionGrid.forEach(cell => {
      cell.tiles?.forEach((t: any, index: number) => {
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
        let tileLayer = (t.layer !== undefined && t.layer !== null) ? Number(t.layer) : Number(dictData?.layer);
        if (isNaN(tileLayer)) tileLayer = 0;

        const isWater = (t.type === 'water') || (dictData?.type === 'water') || (dictData?.category === 'water_base');

        if (tileLayer < 0 || isWater) {
          lMinus1.push(enrichedTile); // Water & Deep Layers
        } else if (tileLayer === 0) {
          l0.push(enrichedTile);      // Ground
        } else {
          // For Y-sorting, calculate physical bottom of the prop
          const frameHeight = dictData?.frame_height ?? t.frameHeight ?? t.frame_height ?? 48;
          const displayHeight = frameHeight * (tileSize / 48);
          // absolute Y position mapped to pixels (standard Y, positive is down)
          const finalTop = cell.y * tileSize - (displayHeight - tileSize) + (t.offsetY || 0);
          
          let internalZIndex = (tileLayer + 10) * 100;
          internalZIndex += Math.floor(finalTop + displayHeight);
          
          enrichedTile.zIndex = internalZIndex;

          if (cell.y < playerY) {
            pBelow.push(enrichedTile); // Behind player
          } else {
            pAbove.push(enrichedTile); // In front of player
          }
        }
      });
    });

    pBelow.sort((a, b) => a.zIndex - b.zIndex);
    pAbove.sort((a, b) => a.zIndex - b.zIndex);

    return { layerMinus1Tiles: lMinus1, layer0Tiles: l0, propsBelow: pBelow, propsAbove: pAbove };
  }, [visionGrid, tileSize, user?.world_y, tileLibrary]);

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
              tile={tile} absPx={Math.floor(tile.absX * tileSize)} absPy={Math.floor(tile.absY * tileSize)}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={false}
              dictionaryData={tileLibrary.get(tile.cleanUrl)}
            />
          ))}
          {/* Layer 0: Ground/Dirt/Grass */}
          {layer0Tiles.map((tile) => (
            <SkiaTile
              key={`tile-${tile.id || (tile.absX + ',' + tile.absY + ',' + (tile.layer || 0) + ',' + tile.index)}`}
              tile={tile} absPx={Math.floor(tile.absX * tileSize)} absPy={Math.floor(tile.absY * tileSize)}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={false}
              dictionaryData={tileLibrary.get(tile.cleanUrl)}
            />
          ))}
          {propsBelow.map((tile) => (
            <SkiaTile
              key={`tile-${tile.id || (tile.absX + ',' + tile.absY + ',' + (tile.layer || 1) + ',' + tile.index)}`}
              tile={tile} absPx={Math.floor(tile.absX * tileSize)} absPy={Math.floor(tile.absY * tileSize)}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={true}
              dictionaryData={tileLibrary.get(tile.cleanUrl)}
            />
          ))}

          {/* WALKABILITY OVERLAY: Blocked Cells & Directional Edge Blocks */}
          {showWalkabilityOverlay && visionGrid.map(cell => {
            const blockedTiles = cell.tiles?.filter((t: any) => (t.isWalkable === false || t.is_walkable === false));
            const edgeTiles = cell.tiles?.filter((t: any) => t.edgeBlocks !== undefined && t.edgeBlocks > 0);
            
            const cellX = Math.floor(cell.x * tileSize);
            const cellY = Math.floor(cell.y * tileSize);
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

      {/* FOREGROUND CANVAS: Props In Front of Player */}
      <Canvas style={{ position: 'absolute', width, height, zIndex: 10 }} pointerEvents="none">
        {/* Transparent fill so this canvas doesn't occlude the background canvas */}
        <Fill color="transparent" />
        <Group transform={transform}>
          {propsAbove.map((tile) => (
            <SkiaTile
              key={`tile-${tile.id || (tile.absX + ',' + tile.absY + ',' + (tile.layer || 2) + ',' + tile.index)}`}
              tile={tile} absPx={Math.floor(tile.absX * tileSize)} absPy={Math.floor(tile.absY * tileSize)}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={true}
              dictionaryData={tileLibrary.get(tile.cleanUrl)}
            />
          ))}
        </Group>
      </Canvas>
    </View>
  );
});
