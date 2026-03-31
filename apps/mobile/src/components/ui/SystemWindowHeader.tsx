import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ViewStyle, ColorValue } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

export interface SystemWindowHeaderProps {
  title: string;
  /** Breathing glow on icon + title row (login / signup / chest) */
  titlePulse?: boolean;
  /** Override outer spacing (e.g. modals vs full panel) */
  containerStyle?: ViewStyle;
}

/**
 * Shared “system window” header: ! in square + title strip + underline glow,
 * matching {@link SoloLevelingPanelFrame} (login / signup).
 */
export function SystemWindowHeader({ title, titlePulse = true, containerStyle }: SystemWindowHeaderProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!titlePulse) {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.58,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [titlePulse, pulse]);

  return (
    <View style={[styles.headerBlock, containerStyle]}>
      <Animated.View style={[styles.headerRow, titlePulse && { opacity: pulse }]}>
        <View style={styles.iconSquareFrame}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>!</Text>
          </View>
        </View>
        <View style={styles.titleTextFrame}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </Animated.View>
      <View style={styles.headerBottomLine}>
        <ExpoLinearGradient
          colors={['transparent', '#00d2ff', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}

/** Shared top/bottom glow strip (login panel + modals) */
export const SYSTEM_MECH_GLOW_COLORS = [
  'transparent',
  '#005c99',
  '#00e5ff',
  '#ffffff',
  '#00e5ff',
  '#005c99',
  'transparent',
] as const;

/** Tuple shape required by expo-linear-gradient `colors` */
export const SYSTEM_MECH_GLOW_GRADIENT_COLORS = SYSTEM_MECH_GLOW_COLORS as unknown as readonly [
  ColorValue,
  ColorValue,
  ...ColorValue[]
];

const styles = StyleSheet.create({
  headerBlock: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 25,
    position: 'relative',
    paddingHorizontal: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexShrink: 1,
    maxWidth: '100%',
  },
  headerBottomLine: {
    position: 'absolute',
    bottom: -1,
    left: '10%',
    width: '80%',
    height: 1,
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  iconSquareFrame: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.75)',
    backgroundColor: 'rgba(2, 12, 32, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  iconText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
    textShadowColor: '#ffffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
    fontFamily: 'Montserrat-Bold',
    includeFontPadding: false,
  },
  titleTextFrame: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.75)',
    backgroundColor: 'rgba(2, 12, 32, 0.92)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    flexShrink: 1,
  },
  headerTitle: {
    color: '#e6ffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 210, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    textTransform: 'uppercase',
  },
});
