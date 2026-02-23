import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Defs, ClipPath, Rect, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS } from './battleTheme';

const VIEWBOX_WIDTH = 515;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface StatusBarMetricProps {
  current: number;
  max: number;
  color: string;
  label?: string;
}

export function StatusBarMetric({ current, max, color, label = 'member' }: StatusBarMetricProps) {
  const hpAnim = useRef(new Animated.Value(current)).current;
  const trailAnim = useRef(new Animated.Value(current)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [prevHp, setPrevHp] = useState(current);

  const clipId = `partyClip-${label.replace(/\s+/g, '-')}`;
  const gradId = `partyGrad-${label.replace(/\s+/g, '-')}`;

  useEffect(() => {
    if (current < prevHp) {
      // Damage: instant drop, shake, delayed trail
      Animated.timing(hpAnim, { toValue: current, duration: 150, useNativeDriver: false }).start();
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        Animated.timing(trailAnim, {
          toValue: current,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, 400);
    } else if (current > prevHp) {
      // Heal: both bars up together
      Animated.timing(hpAnim, { toValue: current, duration: 200, useNativeDriver: false }).start();
      Animated.timing(trailAnim, { toValue: current, duration: 200, useNativeDriver: false }).start();
    }
    setPrevHp(current);
  }, [current]);

  const hpWidth = hpAnim.interpolate({
    inputRange: [0, max],
    outputRange: [0, VIEWBOX_WIDTH],
    extrapolate: 'clamp',
  });
  const trailWidth = trailAnim.interpolate({
    inputRange: [0, max],
    outputRange: [0, VIEWBOX_WIDTH],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.partyHpWrapper, { transform: [{ translateX: shakeAnim }] }]}>
      <View style={[StyleSheet.absoluteFill, { paddingHorizontal: 5, paddingVertical: 2 }]}>
        <Svg viewBox="0 0 515 63" width="100%" height="100%">
          <Defs>
            <ClipPath id={clipId}>
              <Path d="M494,2 L513,31 L494,61 L21,61 L2,31 L21,2 Z" />
            </ClipPath>
            <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color === COLORS.neonCyan ? '#d1faff' : '#f0d1ff'} stopOpacity="1" />
              <Stop offset="0.4" stopColor={color} stopOpacity="1" />
              <Stop offset="1" stopColor={color === COLORS.neonCyan ? '#083344' : '#2e1065'} stopOpacity="1" />
            </SvgGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="rgba(0, 0, 0, 0.6)" clipPath={`url(#${clipId})`} />
          <AnimatedRect x="0" y="0" width={trailWidth} height="63" fill="rgba(255, 255, 255, 0.25)" clipPath={`url(#${clipId})`} />
          <AnimatedRect x="0" y="0" width={hpWidth} height="63" fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />
          <AnimatedRect x="0" y="4" width={hpWidth} height="6" fill="rgba(255, 255, 255, 0.2)" clipPath={`url(#${clipId})`} />
        </Svg>
      </View>
      <Image source={require('@assets/borders/partyhp.png')} style={styles.partyHpBorderImage} contentFit="fill" />
      <View style={styles.hpTextContainer}>
        <Text style={styles.metricText}>
          {Math.floor(current)}/{max}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  partyHpWrapper: {
    width: 110,
    height: 110 * (63 / 515),
    position: 'relative',
    shadowColor: COLORS.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 5,
  },
  partyHpBorderImage: { width: '100%', height: '100%' },
  hpTextContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  metricText: {
    fontSize: 10,
    fontFamily: 'Exo2-Regular',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
