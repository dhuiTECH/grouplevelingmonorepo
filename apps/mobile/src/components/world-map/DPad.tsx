import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, SharedValue } from 'react-native-reanimated';

export type DPadDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface DPadProps {
  activeDirection: SharedValue<DPadDirection | null>;
  disabled?: boolean;
}

const BTN = 48;
const GAP = 2;

const DirButton = memo(({ dir, icon, activeDirection, disabled }: {
  dir: DPadDirection;
  icon: string;
  activeDirection: SharedValue<DPadDirection | null>;
  disabled?: boolean;
}) => {
  // Local shared value to handle the visual 'pressed' state natively
  const isPressed = useSharedValue(false);

  // We combine a Tap and a Pan to create a "bulletproof" hold.
  // Tap handles quick presses. Pan handles holds where the finger might slide slightly.
  const handleBegin = () => {
    'worklet';
    isPressed.value = true;
    activeDirection.value = dir;
  };

  const handleEnd = () => {
    'worklet';
    isPressed.value = false;
    if (activeDirection.value === dir) {
      activeDirection.value = null;
    }
  };

  // The Pan gesture ensures that if the thumb slides/rolls slightly while holding,
  // it doesn't instantly cancel the movement.
  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .hitSlop(25) // Generous hit slop so thumbs don't slip off
    .onBegin(handleBegin)
    .onFinalize(handleEnd);

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .maxDuration(1000000)
    .hitSlop(25)
    .onBegin(handleBegin)
    .onFinalize(handleEnd);

  // Exclusive means whichever fires first takes control, but both use the same logic.
  const combinedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: isPressed.value ? 'rgba(0,229,255,0.35)' : 'rgba(0,0,0,0.5)',
      borderColor: isPressed.value ? 'rgba(0,229,255,0.6)' : 'rgba(0,229,255,0.3)',
    };
  });

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View style={[styles.btn, animatedStyle]}>
        <Ionicons name={icon as any} size={22} color="rgba(255,255,255,0.85)" />
      </Animated.View>
    </GestureDetector>
  );
});

export const DPad = memo(({ activeDirection, disabled }: DPadProps) => {
  return (
    <View style={styles.cross}>
      <View style={styles.row}>
        <View style={styles.spacer} />
        <DirButton dir="UP" icon="caret-up" activeDirection={activeDirection} disabled={disabled} />
        <View style={styles.spacer} />
      </View>
      <View style={styles.row}>
        <DirButton dir="LEFT" icon="caret-back" activeDirection={activeDirection} disabled={disabled} />
        <View style={[styles.btn, styles.centerDot]}>
          <View style={styles.dot} />
        </View>
        <DirButton dir="RIGHT" icon="caret-forward" activeDirection={activeDirection} disabled={disabled} />
      </View>
      <View style={styles.row}>
        <View style={styles.spacer} />
        <DirButton dir="DOWN" icon="caret-down" activeDirection={activeDirection} disabled={disabled} />
        <View style={styles.spacer} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cross: { width: BTN * 3 + GAP * 2, height: BTN * 3 + GAP * 2 },
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  spacer: { width: BTN, height: BTN },
  btn: {
    width: BTN,
    height: BTN,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,229,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(0,229,255,0.15)' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,229,255,0.4)' },
});
