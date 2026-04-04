import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Dimensions, View, Text } from 'react-native';
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  ImageShader,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
  useDerivedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTransition } from '@/context/TransitionContext';
import LayeredAvatar from '@/components/LayeredAvatar';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';
import type { PartyPreviewItem } from '@/context/TransitionContext';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

/** Mosaic “dissolve” over the map snapshot before navigation (Pokémon-style). */
const PIXELATION_DURATION = 780;
const WALK_DURATION = 1750;
const STAGGER_DELAY = 220;
const STEP_FREQUENCY = 10;   // fewer steps = slower hop cycle
const BOUNCE_HEIGHT = 22;

// --- SHADER (pixelation) ---
const mosaicFragmentShader = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float progress;
uniform vec2 resolution;
half4 main(vec2 pos) {
  float squareSize = 1.0 + (progress * 80.0);
  vec2 coord = floor(pos / squareSize) * squareSize;
  return image.eval(coord);
}
`)!;

// Start from near bottom of screen, walk all the way up to battle position (matches BattleScreen party area)
const WALK_UP_FROM = Math.min(520, height * 0.55);

function PartyMemberWalk({
  item,
  index,
  walkProgress,
  allShopItems,
}: {
  item: PartyPreviewItem;
  index: number;
  walkProgress: Animated.SharedValue<number>;
  allShopItems: any[];
}) {
  const startAt = (index * STAGGER_DELAY) / WALK_DURATION;

  // 1. Main motion: walk up from bottom to battle position
  const containerStyle = useAnimatedStyle(() => {
    const localProgress = interpolate(
      walkProgress.value,
      [startAt, 1],
      [0, 1],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(localProgress, [0, 1], [WALK_UP_FROM, 0]);
    // Visible the whole walk: quick fade-in at start so they're seen from bottom to battle position
    const opacity = interpolate(localProgress, [0, 0.04], [0, 1], Extrapolation.CLAMP);
    return { transform: [{ translateY }], opacity };
  });

  // 2. Bounce / hop cycle (secondary motion) + slight wobble
  const bounceStyle = useAnimatedStyle(() => {
    const localProgress = interpolate(
      walkProgress.value,
      [startAt, 1],
      [0, 1],
      Extrapolation.CLAMP
    );
    const bounceFactor = Math.abs(Math.sin(localProgress * STEP_FREQUENCY));
    const settled = localProgress > 0.94;
    const translateY = settled ? 0 : -bounceFactor * BOUNCE_HEIGHT;
    const rotateZ = settled ? 0 : Math.sin(localProgress * STEP_FREQUENCY / 2) * 4;
    return {
      transform: [{ translateY }, { rotateZ: `${rotateZ}deg` }],
    };
  });

  // 3. Dynamic shadow: shrinks when in air, grows when on ground
  const shadowStyle = useAnimatedStyle(() => {
    const localProgress = interpolate(
      walkProgress.value,
      [startAt, 1],
      [0, 1],
      Extrapolation.CLAMP
    );
    const bounceFactor = Math.abs(Math.sin(localProgress * STEP_FREQUENCY));
    const settled = localProgress > 0.94;
    const scale = settled ? 1 : interpolate(bounceFactor, [0, 1], [1, 0.55], Extrapolation.CLAMP);
    // Shadow visible the whole walk (same quick fade-in as avatar)
    const blendIn = interpolate(localProgress, [0, 0.04], [0, 1], Extrapolation.CLAMP);
    const baseShadowOpacity = settled ? 0.5 : interpolate(bounceFactor, [0, 1], [0.5, 0.22], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
      opacity: baseShadowOpacity * blendIn,
    };
  });

  return (
    <Animated.View style={[styles.partyMemberWrapper, containerStyle]}>
      <Animated.View style={[styles.shadow, shadowStyle]} />
      <Animated.View style={[styles.spriteContainer, bounceStyle]}>
        {item.type === 'player' && (
          <View style={styles.avatarWrap}>
            {item.user ? (
              <LayeredAvatar 
                user={item.user} 
                size={110} 
                square 
                hideBackground 
                style={styles.avatarNoBox} 
                allShopItems={allShopItems} 
              />
            ) : (
              <Text style={styles.placeholderText}>?</Text>
            )}
          </View>
        )}
        {item.type === 'pet' && item.petDetails && (
          <View style={styles.avatarWrap}>
            <OptimizedPetAvatar petDetails={item.petDetails} size={110} square hideBackground forceLegacy={true} />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

export const EncounterTransition = () => {
  const {
    snapshotImage,
    isTransitioning,
    setTransitioning,
    setSnapshot,
    partyPreview,
    _onHalfway,
  } = useTransition();

  const [walkPhaseStarted, setWalkPhaseStarted] = useState(false);

  /** Never use a fake `user: null` preview — that renders a naked LayeredAvatar. */
  const party = partyPreview && partyPreview.length > 0 ? partyPreview : [];

  // If the partyPreview was built before allShopItems loaded (race condition),
  // fetch them here so walk-in avatars always render with clothing.
  const [resolvedShopItems, setResolvedShopItems] = useState<any[]>([]);
  const shopFetchedRef = useRef(false);
  useEffect(() => {
    if (!isTransitioning) {
      shopFetchedRef.current = false;
      setResolvedShopItems([]);
      return;
    }
    if (shopFetchedRef.current) return;
    const playerItem = party.find((p) => p.type === 'player') as any | undefined;
    const cached: any[] = playerItem?.allShopItems ?? [];
    if (cached.length > 0) {
      shopFetchedRef.current = true;
      setResolvedShopItems(cached);
      return;
    }
    shopFetchedRef.current = true;
    void (async () => {
      const { data, error } = await supabase.from('shop_items').select('*');
      if (!error && data?.length) setResolvedShopItems(data);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransitioning]);

  const progress = useSharedValue(0);
  const walkProgress = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (!isTransitioning) return;
    const safetyTimer = setTimeout(() => {
      setTransitioning(false);
      setWalkPhaseStarted(false);
    }, 3000);
    return () => clearTimeout(safetyTimer);
  }, [isTransitioning, setTransitioning]);

  useEffect(() => {
    if (!isTransitioning || snapshotImage) return;
    setWalkPhaseStarted(false);
    progress.value = 0;
    walkProgress.value = 0;
    overlayOpacity.value = 0;
    if (!partyPreview?.length) {
      if (_onHalfway) _onHalfway();
      setTransitioning(false);
      return;
    }
    if (_onHalfway) _onHalfway();
    setWalkPhaseStarted(true);
  }, [isTransitioning, snapshotImage, partyPreview, setTransitioning]);

  // Phase 1: Pixelation (only when a map snapshot exists)
  useEffect(() => {
    if (!isTransitioning || !snapshotImage) return;
    setWalkPhaseStarted(false);
    progress.value = 0;
    walkProgress.value = 0;
    overlayOpacity.value = 0;

    progress.value = withTiming(
      1,
      { duration: PIXELATION_DURATION, easing: Easing.in(Easing.exp) },
      (finished) => {
        if (finished) {
          runOnJS(setSnapshot)(null);
          if (_onHalfway) runOnJS(_onHalfway)();
          if (partyPreview?.length) runOnJS(setWalkPhaseStarted)(true);
          else runOnJS(setTransitioning)(false);
        }
      }
    );
  }, [isTransitioning, snapshotImage, partyPreview, setTransitioning]);

  // Phase 2: Party walk-in over real battle background (navigate already happened)
  useEffect(() => {
    if (!walkPhaseStarted) return;
    if (!partyPreview?.length) {
      setTransitioning(false);
      setWalkPhaseStarted(false);
      return;
    }

    overlayOpacity.value = 1;
    walkProgress.value = 0;
    walkProgress.value = withTiming(
      1,
      { duration: WALK_DURATION, easing: Easing.linear },
      (finished) => {
        if (finished) {
          // Trigger BattleScreen fade-in immediately as walk ends
          runOnJS(setTransitioning)(false);
          overlayOpacity.value = withTiming(
            0,
            { duration: 200 }, // Snappier fade out
            (f) => {
              if (f) {
                runOnJS(setWalkPhaseStarted)(false);
                progress.value = 0;
                walkProgress.value = 0;
              }
            }
          );
        }
      }
    );
  }, [walkPhaseStarted, partyPreview, setTransitioning]);

  const uniforms = useDerivedValue(() => ({
    progress: progress.value,
    resolution: [width, height],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!isTransitioning) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Pixelation layer (only while we have snapshot) */}
      {snapshotImage && (
        <Canvas style={styles.pixelOverlay}>
          <Fill>
            <Shader source={mosaicFragmentShader} uniforms={uniforms}>
              <ImageShader
                image={snapshotImage}
                fit="cover"
                rect={{ x: 0, y: 0, width, height }}
              />
            </Shader>
          </Fill>
        </Canvas>
      )}

      {/* Walk-in: only party avatars over transparent overlay (Battle screen visible behind) */}
      {walkPhaseStarted && party.length > 0 && (
        <Animated.View style={[styles.walkOverlay, overlayStyle]} pointerEvents="none">
          <View style={styles.partyRow}>
            {party.slice(0, 3).map((item, index) => (
              <PartyMemberWalk
                key={index}
                item={item as PartyPreviewItem}
                index={index}
                walkProgress={walkProgress}
                allShopItems={resolvedShopItems}
              />
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  pixelOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
  walkOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
  partyRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    bottom: 100,
    left: 0,
    right: 0,
    gap: 20,
  },
  partyMemberWrapper: {
    marginHorizontal: 4,
    alignItems: 'center',
  },
  spriteContainer: {
    zIndex: 2,
  },
  shadow: {
    position: 'absolute',
    bottom: -6,
    width: 44,
    height: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1,
  },
  avatarWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarNoBox: {
    backgroundColor: 'transparent',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
