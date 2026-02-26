import React, { useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';

interface TileRendererProps {
  tile: any;
  tileSize: number;
  mapSettings?: any;
}

export const TileRenderer: React.FC<TileRendererProps> = memo(({ tile, tileSize, mapSettings }) => {
  const {
    imageUrl,
    isSpritesheet,
    frameCount,
    totalFrames,
    frame_count,
    animationSpeed,
    animation_speed,
    duration_ms,
    offsetX,
    offsetY,
    rotation,
    isAutoTile,
    bitmask,
    foamBitmask,
    smartType,
    frameWidth,
    frame_width,
    frameHeight,
    frame_height,
    layer
  } = tile;

  const animationValue = useRef(new Animated.Value(0)).current;

  // SPRITESHEET PARSING - Robust property lookup
  const numFrames = Number(frameCount || totalFrames || frame_count || 1);
  const safeFrames = Math.max(1, Math.floor(numFrames));
  const isActuallyAnimated = isSpritesheet && safeFrames >= 2;

  // Robust speed/duration lookup
  const effectiveSpeed = Number(animationSpeed || animation_speed || (duration_ms ? duration_ms / 1000 : 1));

  const displayWidth = (frameWidth || frame_width || 64) * (tileSize / 64);
  const displayHeight = (frameHeight || frame_height || 64) * (tileSize / 64);

  // FOAM ANIMATION
  const foamAnimValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (foamBitmask > 0 && mapSettings?.foam_sheet_url) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(foamAnimValue, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(foamAnimValue, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [foamBitmask, mapSettings?.foam_sheet_url]);

  // SAFE animation start
  useEffect(() => {
    if (isActuallyAnimated) {
      const duration = effectiveSpeed * 1000;
      animationValue.setValue(0);
      
      // Use steps for the animation if it's a spritesheet
      const steps = [];
      const frameDuration = duration / safeFrames;
      
      for (let i = 0; i < safeFrames; i++) {
        steps.push(
          Animated.timing(animationValue, {
            toValue: i / safeFrames,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.delay(frameDuration)
        );
      }

      const loop = Animated.loop(Animated.sequence(steps));
      loop.start();
      return () => loop.stop();
    } else {
      animationValue.setValue(0);
    }
  }, [isActuallyAnimated, safeFrames, effectiveSpeed]);

  // --- FOAM RENDERER ---
  const renderFoam = () => {
    if (!foamBitmask || foamBitmask <= 0 || !mapSettings?.foam_sheet_url) return null;

    const col = (foamBitmask || 0) % 4;
    const row = Math.floor((foamBitmask || 0) / 4);
    
    return (
      <Animated.View style={{
        position: 'absolute',
        width: tileSize,
        height: tileSize,
        zIndex: -1,
        opacity: foamAnimValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 0.9]
        })
      }}>
        <Image
          source={{ uri: mapSettings.foam_sheet_url }}
          style={{
            width: tileSize * 4,
            height: tileSize * 4,
            position: 'absolute',
            left: -(col * tileSize),
            top: -(row * tileSize),
          }}
          contentFit="fill"
          cachePolicy="memory-disk"
        />
      </Animated.View>
    );
  };

  // Handle Auto-Tile logic
  if (isAutoTile) {
    let activeSheet = mapSettings?.autotile_sheet_url;
    let effectiveSmartType = smartType || 'grass';
    
    if (effectiveSmartType === 'dirt' && mapSettings?.dirt_sheet_url) {
      activeSheet = mapSettings.dirt_sheet_url;
    } else if (effectiveSmartType === 'grass') {
      const variantSeed = Math.abs((tile.x * 73856093) ^ (tile.y * 19349663)) % 81;
      const col = variantSeed % 9;
      const row = Math.floor(variantSeed / 9);
      
      return (
        <View style={[styles.tileContainer, { width: tileSize, height: tileSize, overflow: 'visible' }]}>
          {renderFoam()}
          <View style={{ width: tileSize, height: tileSize, overflow: 'hidden' }}>
            <Image
              source={{ uri: activeSheet }}
              style={{
                width: tileSize * 9,
                height: tileSize * 9,
                position: 'absolute',
                left: -(col * tileSize),
                top: -(row * tileSize),
              }}
              contentFit="fill"
              cachePolicy="memory-disk"
            />
          </View>
        </View>
      );
    }

    if (activeSheet) {
      let col = (bitmask || 0) % 4;
      let row = Math.floor((bitmask || 0) / 4);
      let sheetCols = 4;
      let sheetRows = 4;

      if (effectiveSmartType === 'dirt') {
        const DIRT_TILE_MAP: Record<number, {x: number, y: number}> = {
          0:  { x: 6, y: 5 }, 8:  { x: 4, y: 5 }, 1:  { x: 5, y: 4 }, 2:  { x: 4, y: 1 },
          4:  { x: 8, y: 4 }, 10: { x: 4, y: 3 }, 5:  { x: 6, y: 4 }, 9:  { x: 5, y: 5 },
          3:  { x: 5, y: 2 }, 6:  { x: 8, y: 2 }, 12: { x: 8, y: 5 }, 11: { x: 5, y: 3 },
          7:  { x: 6, y: 2 }, 14: { x: 8, y: 3 }, 13: { x: 6, y: 6 }, 15: { x: 6, y: 3 }
        };
        const mapping = DIRT_TILE_MAP[bitmask || 0] || DIRT_TILE_MAP[0];
        col = mapping.x;
        row = mapping.y;
        sheetCols = 12;
        sheetRows = 13;
      }

      return (
        <View style={[styles.tileContainer, { width: tileSize, height: tileSize, overflow: 'visible' }]}>
          {renderFoam()}
          <View style={{ width: tileSize, height: tileSize, overflow: 'hidden' }}>
            <Image
              source={{ uri: activeSheet }}
              style={{
                width: tileSize * sheetCols,
                height: tileSize * sheetRows,
                position: 'absolute',
                left: -(col * tileSize),
                top: -(row * tileSize),
              }}
              contentFit="fill"
              cachePolicy="memory-disk"
            />
          </View>
        </View>
      );
    }
  }

  // Calculate final positioning
  const finalLeft = -(displayWidth - tileSize) / 2 + (offsetX || 0) * (tileSize / 64);
  const finalTop = -(displayHeight - tileSize) + (offsetY || 0) * (tileSize / 64);

  // Z-Sorting logic for props (similar to web engine)
  const tileLayer = layer !== undefined ? Number(layer) : 0;
  // Base z-index by layer. Ground (0) is base, Roads (1) above, Props (2) top.
  // We add 100 to layer to keep it positive and separate from ground.
  let internalZIndex = (tileLayer + 10) * 100;
  
  // Y-sorting for props to prevent vertical overlap issues
  if (tileLayer === 1 || tileLayer === 2) {
    internalZIndex += Math.floor(finalTop + displayHeight);
  }

  // SPRITESHEET ANIMATION - NOW 100% CRASH-PROOF
  if (isActuallyAnimated) {
    const translateX = animationValue.interpolate({
      inputRange: Array.from({ length: safeFrames }, (_, i) => i / safeFrames),
      outputRange: Array.from({ length: safeFrames }, (_, i) => -displayWidth * i),
      extrapolate: 'clamp'
    });

    return (
      <View style={[
        styles.tileContainer, 
        { 
          width: displayWidth, 
          height: displayHeight,
          left: finalLeft,
          top: finalTop,
          transform: [{ rotate: `${rotation || 0}deg` }],
          zIndex: internalZIndex,
          overflow: 'hidden' // Must hide for spritesheets
        }
      ]}>
        <Animated.View style={{ 
          width: displayWidth * safeFrames, 
          height: displayHeight,
          transform: [{ translateX }]
        }}>
          <Image
            source={{ uri: imageUrl }}
            style={{ width: displayWidth * safeFrames, height: displayHeight }}
            contentFit="fill"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </View>
    );
  }

  // Fallback for non-spritesheets or single-frame images
  return (
    <View style={[
      styles.tileContainer, 
      { 
        width: displayWidth, 
        height: displayHeight,
        left: finalLeft,
        top: finalTop,
        transform: [{ rotate: `${rotation || 0}deg` }],
        zIndex: internalZIndex,
        overflow: tileLayer === 0 ? 'hidden' : 'visible' // Allow props to overhang if needed
      }
    ]}>
      <Image
        source={{ uri: imageUrl }}
        style={{ 
          width: isSpritesheet ? displayWidth * safeFrames : displayWidth, 
          height: displayHeight 
        }}
        contentFit="fill"
        cachePolicy="memory-disk"
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // Deep equality check for memoization
  return prevProps.tileSize === nextProps.tileSize &&
         prevProps.tile.x === nextProps.tile.x &&
         prevProps.tile.y === nextProps.tile.y &&
         prevProps.tile.imageUrl === nextProps.tile.imageUrl &&
         prevProps.tile.bitmask === nextProps.tile.bitmask &&
         prevProps.tile.foamBitmask === nextProps.tile.foamBitmask &&
         prevProps.tile.rotation === nextProps.tile.rotation &&
         prevProps.mapSettings?.autotile_sheet_url === nextProps.mapSettings?.autotile_sheet_url;
});

const styles = StyleSheet.create({
  tileContainer: {
    position: 'absolute',
    overflow: 'hidden',
  }
});