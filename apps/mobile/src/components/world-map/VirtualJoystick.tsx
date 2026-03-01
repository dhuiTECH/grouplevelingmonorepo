import React, { useRef, useEffect } from 'react';
import { View, Animated, PanResponder, StyleSheet } from 'react-native';

type Dir = 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';

const OUTER_R = 90;
const KNOB_R = 28;
const MAX_DRAG = 72;
const DEAD_ZONE = 0.12;
const SPRINT_THRESHOLD = 0.65;
const SPRINT_R = OUTER_R * SPRINT_THRESHOLD;

const WALK_MS = 380;
const SPRINT_MS = 200;

function snapDir(dx: number, dy: number): Dir {
  const a = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
  if (a >= 337.5 || a < 22.5)  return 'E';
  if (a < 67.5)                 return 'SE';
  if (a < 112.5)                return 'S';
  if (a < 157.5)                return 'SW';
  if (a < 202.5)                return 'W';
  if (a < 247.5)                return 'NW';
  if (a < 292.5)                return 'N';
  return 'NE';
}

interface VirtualJoystickProps {
  onMove: (dir: Dir) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove }) => {
  const knobX = useRef(new Animated.Value(0)).current;
  const knobY = useRef(new Animated.Value(0)).current;
  const sprintAnim = useRef(new Animated.Value(0)).current;

  const activeDir = useRef<Dir | null>(null);
  const isSprint = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startMovement = (dir: Dir, sprint: boolean) => {
    clearTimer();
    activeDir.current = dir;
    isSprint.current = sprint;
    const interval = sprint ? SPRINT_MS : WALK_MS;
    onMoveRef.current(dir);
    timerRef.current = setInterval(() => {
      if (activeDir.current) onMoveRef.current(activeDir.current);
    }, interval);
  };

  const stopMovement = () => {
    clearTimer();
    activeDir.current = null;
    isSprint.current = false;
    Animated.spring(knobX, { toValue: 0, useNativeDriver: false, friction: 8, tension: 120 }).start();
    Animated.spring(knobY, { toValue: 0, useNativeDriver: false, friction: 8, tension: 120 }).start();
    Animated.timing(sprintAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderMove: (_, g) => {
      const { dx, dy } = g;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mag = dist / MAX_DRAG;

      const clamped = Math.min(dist, MAX_DRAG);
      const ratio = clamped / Math.max(dist, 0.001);
      knobX.setValue(dx * ratio);
      knobY.setValue(dy * ratio);

      if (mag < DEAD_ZONE) {
        clearTimer();
        activeDir.current = null;
        Animated.timing(sprintAnim, { toValue: 0, duration: 100, useNativeDriver: false }).start();
        return;
      }

      const dir = snapDir(dx, dy);
      const sprint = mag >= SPRINT_THRESHOLD;

      Animated.timing(sprintAnim, {
        toValue: sprint ? 1 : 0,
        duration: 120,
        useNativeDriver: false,
      }).start();

      if (dir !== activeDir.current || sprint !== isSprint.current) {
        startMovement(dir, sprint);
      }
    },

    onPanResponderRelease: () => stopMovement(),
    onPanResponderTerminate: () => {
      clearTimer();
      activeDir.current = null;
      knobX.setValue(0);
      knobY.setValue(0);
      sprintAnim.setValue(0);
    },
  })).current;

  const knobBorderColor = sprintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0, 229, 255, 0.85)', 'rgba(249, 115, 22, 0.85)'],
  });
  const knobBg = sprintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0, 229, 255, 0.25)', 'rgba(249, 115, 22, 0.25)'],
  });

  return (
    <View style={styles.hitArea} {...panResponder.panHandlers}>
      <View style={styles.outerRing}>
        <View style={styles.sprintRing} />
        <View style={[styles.dirDot, styles.dirN]} />
        <View style={[styles.dirDot, styles.dirS]} />
        <View style={[styles.dirDot, styles.dirE]} />
        <View style={[styles.dirDot, styles.dirW]} />
      </View>

      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: knobBg,
            borderColor: knobBorderColor,
            transform: [{ translateX: knobX }, { translateY: knobY }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hitArea: {
    width: OUTER_R * 2 + 40,
    height: OUTER_R * 2 + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: OUTER_R * 2,
    height: OUTER_R * 2,
    borderRadius: OUTER_R,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sprintRing: {
    width: SPRINT_R * 2,
    height: SPRINT_R * 2,
    borderRadius: SPRINT_R,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
    borderStyle: 'dashed',
  },
  dirDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 229, 255, 0.5)',
  },
  dirN: { top: 6, alignSelf: 'center' },
  dirS: { bottom: 6, alignSelf: 'center' },
  dirE: { right: 6, top: OUTER_R - 3 },
  dirW: { left: 6, top: OUTER_R - 3 },
  knob: {
    position: 'absolute',
    width: KNOB_R * 2,
    height: KNOB_R * 2,
    borderRadius: KNOB_R,
    borderWidth: 2,
    shadowColor: '#00E5FF',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
