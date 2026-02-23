import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Defs, ClipPath, Rect, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWBOX_WIDTH = 515;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface EnemyHPBarProps {
  hpPercentage: number;
  currentHP: number;
  maxHP: number;
}

export function EnemyHPBar({ currentHP, maxHP }: EnemyHPBarProps) {
  const hpAnim = useRef(new Animated.Value(currentHP)).current;
  const trailAnim = useRef(new Animated.Value(currentHP)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [prevHp, setPrevHp] = useState(currentHP);

  useEffect(() => {
    if (currentHP < prevHp) {
      Animated.timing(hpAnim, { toValue: currentHP, duration: 150, useNativeDriver: false }).start();
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        Animated.timing(trailAnim, {
          toValue: currentHP,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, 400);
    } else if (currentHP > prevHp) {
      Animated.timing(hpAnim, { toValue: currentHP, duration: 200, useNativeDriver: false }).start();
      Animated.timing(trailAnim, { toValue: currentHP, duration: 200, useNativeDriver: false }).start();
    }
    setPrevHp(currentHP);
  }, [currentHP]);

  const hpWidth = hpAnim.interpolate({
    inputRange: [0, maxHP],
    outputRange: [0, VIEWBOX_WIDTH],
    extrapolate: 'clamp',
  });
  const trailWidth = trailAnim.interpolate({
    inputRange: [0, maxHP],
    outputRange: [0, VIEWBOX_WIDTH],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.enemyHpWrapper, { transform: [{ translateX: shakeAnim }] }]}>
      <View style={[StyleSheet.absoluteFill, { paddingHorizontal: 5, paddingVertical: 2 }]}>
        <Svg viewBox="0 0 515 63" width="100%" height="100%">
          <Defs>
            <ClipPath id="enemyClip">
              <Path d="M494,2 L513,31 L494,61 L21,61 L2,31 L21,2 Z" />
            </ClipPath>
            <SvgGradient id="enemyHpGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ff4d4d" stopOpacity="1" />
              <Stop offset="0.4" stopColor="#ff0000" stopOpacity="1" />
              <Stop offset="1" stopColor="#660000" stopOpacity="1" />
            </SvgGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="rgba(0, 0, 0, 0.6)" clipPath="url(#enemyClip)" />
          <AnimatedRect x="0" y="0" width={trailWidth} height="63" fill="rgba(255, 255, 255, 0.25)" clipPath="url(#enemyClip)" />
          <AnimatedRect x="0" y="0" width={hpWidth} height="63" fill="url(#enemyHpGradient)" clipPath="url(#enemyClip)" />
          <AnimatedRect x="0" y="4" width={hpWidth} height="6" fill="rgba(255, 255, 255, 0.25)" clipPath="url(#enemyClip)" />
        </Svg>
      </View>
      <Image source={require('@assets/borders/enemyhp.png')} style={styles.enemyHpBorderImage} contentFit="fill" />
      <View style={styles.hpTextContainer}>
        <Text style={styles.metricText}>
          {Math.floor(currentHP).toLocaleString()} / {maxHP.toLocaleString()}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  enemyHpWrapper: {
    width: SCREEN_WIDTH * 0.4,
    height: (SCREEN_WIDTH * 0.4) * (63 / 515),
    position: 'relative',
    marginVertical: 4,
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 5,
  },
  enemyHpBorderImage: { width: '100%', height: '100%' },
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
