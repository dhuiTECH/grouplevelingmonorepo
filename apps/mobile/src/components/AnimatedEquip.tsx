import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';

interface AnimatedEquipProps {
  src: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  fps?: number;
  style?: any;
  paused?: boolean;
}

export default function AnimatedEquip({
  src,
  frameWidth,
  frameHeight,
  totalFrames,
  fps = 10,
  style,
  paused = false
}: AnimatedEquipProps) {
  const frameAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setContainerWidth((prev) => (prev === w ? prev : w));
  }, []);

  useEffect(() => {
    if (totalFrames <= 1 || paused || containerWidth === 0) {
      frameAnim.setValue(0);
      return;
    }

    const frameDuration = 1000 / fps;
    const steps: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < totalFrames; i++) {
      steps.push(
        Animated.timing(frameAnim, {
          toValue: i,
          duration: 0,
          easing: Easing.step0,
          useNativeDriver: true,
        }),
        Animated.delay(frameDuration),
      );
    }

    const loop = Animated.loop(Animated.sequence(steps));
    loop.start();
    return () => loop.stop();
  }, [totalFrames, fps, paused, frameAnim, containerWidth]);

  const interpFrames = Math.max(2, totalFrames);
  const stripWidth = totalFrames * containerWidth;

  const translateX = useMemo(() => {
    if (containerWidth === 0) {
      return frameAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0],
        extrapolate: 'clamp',
      });
    }
    return frameAnim.interpolate({
      inputRange: Array.from({ length: interpFrames }, (_, i) => i),
      outputRange: Array.from({ length: interpFrames }, (_, i) => -i * containerWidth),
      extrapolate: 'clamp',
    });
  }, [interpFrames, containerWidth, frameAnim]);

  return (
    <View style={[styles.container, style, { overflow: 'hidden' }]} onLayout={onLayout}>
      {containerWidth > 0 && (
        <Animated.View
          style={{
            height: '100%',
            width: stripWidth,
            transform: [{ translateX: translateX as any }],
          }}
        >
          <Image
            source={{ uri: src }}
            style={{ width: stripWidth, height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100, 
    height: 100,
  }
});
