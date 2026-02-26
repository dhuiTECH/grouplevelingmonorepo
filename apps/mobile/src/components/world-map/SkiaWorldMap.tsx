import React, { useMemo, useEffect } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { useSkiaAssets } from './useSkiaAssets';
import { SkiaTile } from './SkiaTile';
import { useTileLibrary } from '../../contexts/TileContext';

interface SkiaWorldMapProps {
  visionGrid: any[];
  mapSettings: any;
  user: any;
  tileSize: number;
  children?: React.ReactNode; // For passing Player/Party/Nodes
}

const { width, height } = Dimensions.get('window');

export const SkiaWorldMap: React.FC<SkiaWorldMapProps> = React.memo(({ 
  visionGrid, mapSettings, user, tileSize, children 
}) => {
  const { tileLibrary } = useTileLibrary();

  // Extract URLs to load
  const urlsToLoad = useMemo(() => {
    const urls = new Set<string>();
    if (mapSettings?.autotile_sheet_url) urls.add(mapSettings.autotile_sheet_url);
    if (mapSettings?.dirt_sheet_url) urls.add(mapSettings.dirt_sheet_url);
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
  // Since we also offset the group by +width/2 and +height/2 in the transform,
  // we just need the map to end up at the player's negative coordinate.
  const mapLeftTarget = -(user?.world_x || 0) * tileSize;
  const mapTopTarget = -(user?.world_y || 0) * tileSize;

  const mapLeft = useSharedValue(mapLeftTarget);
  const mapTop = useSharedValue(mapTopTarget);

  useEffect(() => {
    mapLeft.value = withTiming(mapLeftTarget, { duration: 300, easing: Easing.out(Easing.quad) });
    mapTop.value = withTiming(mapTopTarget, { duration: 300, easing: Easing.out(Easing.quad) });
  }, [mapLeftTarget, mapTopTarget]);

  const transform = useDerivedValue(() => [
    { translateX: mapLeft.value + (width / 2) },
    { translateY: mapTop.value + (height / 2) }
  ]);

  // Extract layers and perform Y-sorting
  const { layerMinus1Tiles, layer0Tiles, propsBelow, propsAbove } = useMemo(() => {
    const lMinus1: any[] = [];
    const l0: any[] = [];
    const pBelow: any[] = [];
    const pAbove: any[] = [];
    
    const playerY = user?.world_y || 0;

    visionGrid.forEach(cell => {
      cell.tiles?.forEach((t: any, index: number) => {
        const enrichedTile = { ...t, absX: cell.x, absY: cell.y, index };
        const cleanUrl = t.imageUrl?.split('?')[0];
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
          const displayHeight = (dictData?.frame_height ?? t.frameHeight ?? t.frame_height ?? 48) * (tileSize / 48);
          // absolute Y position mapped to pixels (standard Y, positive is down)
          const finalTop = cell.y * tileSize - (displayHeight - tileSize) + (t.offsetY || 0);
          
          let internalZIndex = (tileLayer + 10) * 100;
          internalZIndex += Math.floor(finalTop + displayHeight);
          
          enrichedTile.zIndex = internalZIndex;

          // Y-SORTING: 
          // If the prop's base tile (cell.y) is NORTH of the player (cell.y < playerY), 
          // it is further away and should be BEHIND the player (pBelow).
          // If it is SOUTH of the player (cell.y >= playerY), 
          // it is closer and should be IN FRONT of the player (pAbove).
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
        <Group transform={transform}>
          {/* Layer -1: Water (Always at the very bottom) */}
          {layerMinus1Tiles.map((tile) => (
            <SkiaTile
              key={`tile-${tile.absX}-${tile.absY}-${tile.index}-${tile.imageUrl?.split('?')[0]}-water`}
              tile={tile} absPx={tile.absX * tileSize} absPy={tile.absY * tileSize}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={false}
              dictionaryData={tileLibrary.get(tile.imageUrl?.split('?')[0])}
            />
          ))}
          {/* Layer 0: Ground/Dirt/Grass */}
          {layer0Tiles.map((tile) => (
            <SkiaTile
              key={`tile-${tile.absX}-${tile.absY}-${tile.index}-${tile.imageUrl?.split('?')[0]}-l0`}
              tile={tile} absPx={tile.absX * tileSize} absPy={tile.absY * tileSize}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={false}
              dictionaryData={tileLibrary.get(tile.imageUrl?.split('?')[0])}
            />
          ))}
          {propsBelow.map((tile) => (
            <SkiaTile
              key={`tile-${tile.absX}-${tile.absY}-${tile.index}-${tile.imageUrl?.split('?')[0]}-prop-below`}
              tile={tile} absPx={tile.absX * tileSize} absPy={tile.absY * tileSize}
              tileSize={tileSize} images={images} mapSettings={mapSettings}
              animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={true}
              dictionaryData={tileLibrary.get(tile.imageUrl?.split('?')[0])}
            />
          ))}
        </Group>
      </Canvas>

              {/* REACT NATIVE LAYER: Player, Party, Nodes */}
              <View style={{ position: 'absolute', zIndex: 5, width, height }} pointerEvents="box-none">
                {children}
              </View>

              {/* FOREGROUND CANVAS: Props In Front of Player */}
              <Canvas style={{ position: 'absolute', width, height, zIndex: 10 }} pointerEvents="none">
                <Group transform={transform}>
                  {propsAbove.map((tile) => (
                    <SkiaTile
                      key={`tile-${tile.absX}-${tile.absY}-${tile.index}-${tile.imageUrl?.split('?')[0]}-prop-above`}
                      tile={tile} absPx={tile.absX * tileSize} absPy={tile.absY * tileSize}
                      tileSize={tileSize} images={images} mapSettings={mapSettings}
                      animationFrame={animationFrame} foamOpacity={foamOpacity} isProp={true}
                      dictionaryData={tileLibrary.get(tile.imageUrl?.split('?')[0])}
                    />
          ))}
        </Group>
      </Canvas>
    </View>
  );
});
