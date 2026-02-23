import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Easing, ViewStyle } from 'react-native';

interface SystemHpBarProps {
  currentHp: number;
  maxHp: number;
  type?: 'party' | 'mob';
  /** Optional override for container (e.g. compact layout in battle) */
  containerStyle?: ViewStyle;
  /** Optional override for bar wrapper height */
  barHeight?: number;
}

export default function SystemHpBar({ currentHp, maxHp, type = 'party', containerStyle, barHeight }: SystemHpBarProps) {
  // Animation Values
  const hpAnim = useRef(new Animated.Value(currentHp)).current;
  const trailAnim = useRef(new Animated.Value(currentHp)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // State for styling
  const [isHealing, setIsHealing] = useState(false);
  const [prevHp, setPrevHp] = useState(currentHp);

  const isCritical = currentHp > 0 && (currentHp / maxHp) <= 0.2;

  // Colors based on entity type
  const isMob = type === 'mob';
  const defaultColor = isMob ? '#ff3333' : '#00e5ff'; // Red for mobs, Cyan for party
  const criticalColor = isMob ? '#aa0000' : '#ff003c'; // Dark red for mob crit, Bright red for party crit
  const healColor = '#00ff88';

  const activeColor = isHealing ? healColor : isCritical ? criticalColor : defaultColor;

  useEffect(() => {
    if (currentHp < prevHp) {
      // TOOK DAMAGE
      // 1. Instant HP drop
      Animated.timing(hpAnim, {
        toValue: currentHp,
        duration: 150,
        useNativeDriver: false,
      }).start();

      // 2. Shake effect
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      // 3. Delayed trail drop
      setTimeout(() => {
        Animated.timing(trailAnim, {
          toValue: currentHp,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, 400);
    } else if (currentHp > prevHp) {
      // HEALED
      setIsHealing(true);

      // Both bars go up instantly together
      Animated.timing(hpAnim, { toValue: currentHp, duration: 200, useNativeDriver: false }).start();
      Animated.timing(trailAnim, { toValue: currentHp, duration: 200, useNativeDriver: false }).start();

      setTimeout(() => setIsHealing(false), 400);
    }

    setPrevHp(currentHp);
  }, [currentHp]);

  // Interpolate widths
  const hpWidth = hpAnim.interpolate({
    inputRange: [0, maxHp],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const trailWidth = trailAnim.interpolate({
    inputRange: [0, maxHp],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.container, containerStyle, { transform: [{ translateX: shakeAnim }] }]}>
      {/* The Standard Bar Container (No Skew) */}
      <View style={[styles.barWrapper, { borderColor: activeColor }, barHeight != null && { height: barHeight }]}>
        <View style={styles.trackBackground} />

        {/* Trail Bar (White) */}
        <Animated.View style={[styles.trailBar, { width: trailWidth }]} />

        {/* Main HP Bar */}
        <Animated.View
          style={[
            styles.mainBar,
            {
              width: hpWidth,
              backgroundColor: activeColor,
              shadowColor: activeColor,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginVertical: 15,
  },
  barWrapper: {
    height: 16,
    width: '100%',
    backgroundColor: '#050a14',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  trackBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050a14',
    opacity: 0.8,
  },
  trailBar: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    opacity: 0.9,
  },
  mainBar: {
    ...StyleSheet.absoluteFillObject,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
});
