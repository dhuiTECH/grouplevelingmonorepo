import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';

interface ShockwaveProps {
  x: number;
  y: number;
  color: string;
  onComplete: () => void;
}

export function Shockwave({ x, y, color, onComplete }: ShockwaveProps) {
  const scale = useSharedValue(0.1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(2.5, { duration: 400, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[
      styles.shockwave, 
      { left: x - 50, top: y - 50, borderColor: color }, 
      animatedStyle
    ]} />
  );
}

const styles = StyleSheet.create({
  shockwave: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  }
});