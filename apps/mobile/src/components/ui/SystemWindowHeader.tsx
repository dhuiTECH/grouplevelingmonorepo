import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ViewStyle, ColorValue } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

export interface SystemWindowHeaderProps {
  title: string;
  /** Breathing glow on icon + title row (login / signup / chest) */
  titlePulse?: boolean;
  /** Override outer spacing (e.g. modals vs full panel) */
  containerStyle?: ViewStyle;
  /** Smaller fixed-size “!” + title (inventory modals). */
  compact?: boolean;
  /**
   * When compact, center the ! + title row (e.g. full-screen modals).
   * Default compact layout is start-aligned with right padding for a close button.
   */
  centered?: boolean;
}

/**
 * Shared “system window” header: ! in square + title strip + underline glow,
 * matching {@link SoloLevelingPanelFrame} (login / signup).
 */
export function SystemWindowHeader({
  title,
  titlePulse = true,
  containerStyle,
  compact = false,
  centered = false,
}: SystemWindowHeaderProps) {
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

  const c = compact ? compactStyles : null;
  const useCenteredCompact = compact && centered;

  return (
    <View style={[styles.headerBlock, compact && styles.headerBlockCompact, containerStyle]}>
      <Animated.View
        style={[
          styles.headerRow,
          compact && styles.headerRowCompact,
          useCenteredCompact && compactStyles.headerRowCompactCentered,
          compact && !useCenteredCompact && compactStyles.headerRowPadForClose,
          titlePulse && { opacity: pulse },
        ]}
      >
        <View style={[styles.iconSquareFrame, c?.iconSquareFrame]}>
          <View style={[styles.iconCircle, c?.iconCircle]}>
            <Text style={[styles.iconText, c?.iconText]}>!</Text>
          </View>
        </View>
        <View
          style={[
            styles.titleTextFrame,
            c?.titleTextFrame,
            useCenteredCompact && compactStyles.titleTextFrameCentered,
          ]}
        >
          <Text style={[styles.headerTitle, c?.headerTitle]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
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
  headerRowCompact: {
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
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
    flexShrink: 0,
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
  headerBlockCompact: {
    paddingBottom: 6,
    marginBottom: 8,
    paddingHorizontal: 0,
  },
});

/** Same visual weight in every modal; smaller title strip for narrow modals */
const compactStyles = StyleSheet.create({
  /** Full-width modals: center ! + title; symmetric inset clears absolute close (≈44px). */
  headerRowCompactCentered: {
    justifyContent: 'center',
    paddingHorizontal: 44,
  },
  /** Title strip hugs content when centered (avoid flex:1 stretching the box). */
  titleTextFrameCentered: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: '78%',
  },
  /** Reserve space when a modal close (X) sits top-right over the header row */
  headerRowPadForClose: {
    paddingRight: 32,
  },
  iconSquareFrame: {
    width: 28,
    height: 28,
    borderWidth: 1,
    flexShrink: 0,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconText: {
    fontSize: 11,
  },
  titleTextFrame: {
    minHeight: 28,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    flex: 1,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 10,
    letterSpacing: 0.75,
    lineHeight: 13,
  },
});
