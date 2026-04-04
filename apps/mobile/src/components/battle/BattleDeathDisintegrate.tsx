import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  ImageShader,
  useImage,
  makeImageFromView,
} from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { captureRef as captureViewSnapshot } from 'react-native-view-shot';
import {
  useSharedValue,
  withTiming,
  Easing,
  useDerivedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import { DEATH_DISINTEGRATION_MS } from './battleDeathOutro';

/**
 * Red-tinted pixel blocks push outward from center + fade (single pass).
 */
const redPixelSpreadShader = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float progress;
uniform vec2 resolution;

half4 main(vec2 pos) {
  vec2 res = resolution;
  vec2 ctr = res * 0.5;
  vec2 delta = pos - ctr;
  float mag = length(delta);
  vec2 dir = mag > 0.5 ? delta / mag : vec2(1.0, 0.0);

  float spread = progress * min(res.x, res.y) * 0.48;
  vec2 src = pos - dir * spread;

  float cell = max(2.5, 3.0 + progress * 18.0);
  vec2 snapped = floor(src / cell) * cell + cell * 0.5;
  snapped.x = clamp(snapped.x, 0.0, res.x - 1.0);
  snapped.y = clamp(snapped.y, 0.0, res.y - 1.0);

  half4 c = image.eval(snapped);
  if (c.a < 0.008) {
    return half4(0.0);
  }
  half3 red = mix(c.rgb, half3(1.0, 0.16, 0.12), 0.22 + progress * 0.62);
  float fade = 1.0 - smoothstep(0.38, 1.0, progress);
  return half4(red, c.a * fade);
}
`)!;

interface BattleDeathDisintegrateProps {
  active: boolean;
  captureRef: React.RefObject<View | null>;
  width: number;
  height: number;
  onCaptureReady?: () => void;
}

function disposeIfNeeded(img: SkImage | null | undefined) {
  try {
    img?.dispose?.();
  } catch {
    // ignore
  }
}

export function BattleDeathDisintegrate({
  active,
  captureRef,
  width,
  height,
  onCaptureReady,
}: BattleDeathDisintegrateProps) {
  const [nativeSnap, setNativeSnap] = useState<SkImage | null>(null);
  const [uriSource, setUriSource] = useState<string | null>(null);
  const [lockedSize, setLockedSize] = useState<{ w: number; h: number } | null>(null);
  const imageFromUri = useImage(uriSource);
  const progress = useSharedValue(0);
  const firedReadyRef = useRef(false);
  const nativeSnapRef = useRef<SkImage | null>(null);
  const captureStartedRef = useRef(false);
  const animatedForDrawableRef = useRef<SkImage | null>(null);

  const drawable = nativeSnap ?? imageFromUri;

  const notifyReady = useCallback(() => {
    if (firedReadyRef.current) return;
    firedReadyRef.current = true;
    onCaptureReady?.();
  }, [onCaptureReady]);

  useEffect(() => {
    if (!active) {
      firedReadyRef.current = false;
      captureStartedRef.current = false;
      animatedForDrawableRef.current = null;
      setLockedSize(null);
      setUriSource(null);
      disposeIfNeeded(nativeSnapRef.current);
      nativeSnapRef.current = null;
      setNativeSnap(null);
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }

    if (width < 12 || height < 12) return;
    if (lockedSize === null) {
      setLockedSize({ w: width, h: height });
    }
  }, [active, width, height, lockedSize]);

  useEffect(() => {
    if (!active || lockedSize === null) return;
    if (captureStartedRef.current) return;
    captureStartedRef.current = true;

    let cancelled = false;

    void (async () => {
      const ref = captureRef.current;
      if (!ref) return;

      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      if (cancelled) return;

      if (Platform.OS === 'web') {
        try {
          const uri = await captureViewSnapshot(ref, {
            format: 'png',
            quality: 0.92,
            result: 'data-uri',
            handleGLSurfaceViewOnAndroid: true,
          });
          if (!cancelled && typeof uri === 'string' && uri.length > 0) setUriSource(uri);
        } catch (e) {
          console.warn('[BattleDeathDisintegrate] web capture failed', e);
        }
        return;
      }

      try {
        const img = await makeImageFromView(captureRef);
        if (cancelled) {
          disposeIfNeeded(img);
          return;
        }
        if (img) {
          disposeIfNeeded(nativeSnapRef.current);
          nativeSnapRef.current = img;
          setNativeSnap(img);
          return;
        }
      } catch (e) {
        console.warn('[BattleDeathDisintegrate] makeImageFromView failed, trying view-shot', e);
      }

      try {
        const uri = await captureViewSnapshot(ref, {
          format: 'png',
          quality: 0.92,
          result: 'data-uri',
          handleGLSurfaceViewOnAndroid: true,
        });
        if (!cancelled && typeof uri === 'string' && uri.length > 0) setUriSource(uri);
      } catch (e2) {
        console.warn('[BattleDeathDisintegrate] view-shot fallback failed', e2);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, lockedSize, captureRef]);

  useEffect(() => {
    if (!active || !drawable || lockedSize === null) return;
    if (animatedForDrawableRef.current === drawable) return;
    animatedForDrawableRef.current = drawable;

    notifyReady();
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: DEATH_DISINTEGRATION_MS,
      easing: Easing.out(Easing.cubic),
    });

    return () => {
      cancelAnimation(progress);
    };
  }, [active, drawable, lockedSize, notifyReady, progress]);

  useEffect(() => {
    return () => {
      disposeIfNeeded(nativeSnapRef.current);
      nativeSnapRef.current = null;
    };
  }, []);

  const lw = lockedSize?.w ?? 0;
  const lh = lockedSize?.h ?? 0;

  const uniforms = useDerivedValue(() => ({
    progress: progress.value,
    resolution: [Math.max(1, lw), Math.max(1, lh)],
  }));

  if (!active || !drawable || lw < 12 || lh < 12) {
    return null;
  }

  return (
    <View
      style={[styles.layer, { width: lw, height: lh }]}
      pointerEvents="none"
      collapsable={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas
        opaque={false}
        style={{ width: lw, height: lh, backgroundColor: 'transparent' }}
        pointerEvents="none"
      >
        <Fill>
          <Shader source={redPixelSpreadShader} uniforms={uniforms}>
            <ImageShader
              image={drawable}
              fit="fill"
              rect={{ x: 0, y: 0, width: lw, height: lh }}
            />
          </Shader>
        </Fill>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 50,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
});
