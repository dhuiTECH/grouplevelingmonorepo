import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Image,
  type ImageSourcePropType,
} from 'react-native';

const NET_SIZE = 88;

interface CaptureNetSwingOverlayProps {
  visible: boolean;
  /** Screen-space point toward the enemy (e.g. from EnemyBlock measure). */
  targetX: number;
  targetY: number;
  netSource: ImageSourcePropType;
  /** Fires once the swing animation finishes (success/fail decided by parent after this). */
  onSwingComplete: () => void;
}

/**
 * Full-screen overlay: net swings from the player side toward the enemy at a 45° throw angle.
 */
export function CaptureNetSwingOverlay({
  visible,
  targetX,
  targetY,
  netSource,
  onSwingComplete,
}: CaptureNetSwingOverlayProps) {
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const firedRef = useRef(false);
  const onEndRef = useRef(onSwingComplete);
  onEndRef.current = onSwingComplete;

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      firedRef.current = false;
      return;
    }
    firedRef.current = false;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (!finished || firedRef.current) return;
      firedRef.current = true;
      onEndRef.current();
    });
    return () => anim.stop();
  }, [visible, progress]);

  if (!visible) return null;

  const startX = 28;
  const startY = height - 220;
  const endX = Math.min(width - NET_SIZE, Math.max(NET_SIZE * 0.5, targetX - NET_SIZE / 2));
  const endY = Math.max(80, Math.min(height - 100, targetY - NET_SIZE * 0.35));

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, endX - startX],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, endY - startY],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-18deg', '45deg'],
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.netWrap,
          {
            left: startX,
            top: startY,
            transform: [{ translateX }, { translateY }, { rotate }],
          },
        ]}
      >
        <Image source={netSource} style={styles.netImg} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  netWrap: {
    position: 'absolute',
    width: NET_SIZE,
    height: NET_SIZE,
  },
  netImg: {
    width: NET_SIZE,
    height: NET_SIZE,
  },
});
