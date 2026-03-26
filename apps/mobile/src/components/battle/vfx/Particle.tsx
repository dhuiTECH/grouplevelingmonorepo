import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDecay, Easing, runOnJS, withSequence, withSpring } from 'react-native-reanimated';

interface ParticleProps {
  x: number;
  y: number;
  color: string;
  onComplete: () => void;
}

export function Particle({ x, y, color, onComplete }: ParticleProps) {
  const posX = useSharedValue(x);
  const posY = useSharedValue(y);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const speed = color === '#fbbf24' ? Math.random() * 20 + 5 : Math.random() * 12 + 5;
    
    const vx = Math.cos(angle) * speed * 20; // Velocity for withDecay
    const vy = Math.sin(angle) * speed * 20;

    posX.value = withDecay({ velocity: vx, deceleration: 0.98 });
    posY.value = withDecay({ velocity: vy, deceleration: 0.98 });
    
    opacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
    
    scale.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: posX.value },
      { translateY: posY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.particle, { backgroundColor: color }, animatedStyle]} />
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  }
});
