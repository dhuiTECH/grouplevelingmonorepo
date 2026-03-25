import React, { ReactNode, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path, Line, Rect, Defs, Pattern } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';

/** Solo Leveling “system window”: icon square + title box are separate; shared height */
const ICON_FRAME = 44;
const ROW_GAP = 8;

type Props = {
  title: string;
  children?: ReactNode;
};

/**
 * Full-panel chrome matching {@link ChestOpeningModal}: mech borders, HUD frame, scanlines,
 * corner brackets, side accents, glowing "!" + title strip.
 */
export function SoloLevelingPanelFrame({ title, children }: Props) {
  const { width: winW } = useWindowDimensions();
  const W = Math.min(winW - 36, 380); // Ensure it fits safely within KeyboardAvoidingView padding (16 on each side)
  const [frameH, setFrameH] = useState(360);
  const titlePulse = useRef(new Animated.Value(1)).current;
  const openScaleY = useRef(new Animated.Value(0.035)).current;
  const isFocused = useIsFocused();

  /** Every time this screen becomes focused (signup / login), panel opens from a thin strip like a system window. */
  useEffect(() => {
    if (!isFocused) {
      // Optional: reset to thin state when losing focus so it's ready to open next time
      openScaleY.setValue(0.035);
      return;
    }

    let cancelled = false;
    openScaleY.setValue(0.035);
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      Animated.timing(openScaleY, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [openScaleY, isFocused]);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(titlePulse, {
          toValue: 0.58,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(titlePulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [titlePulse]);

  const onHudLayout = (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (h > 0) setFrameH(h);
  };

  return (
    <Animated.View
      style={[styles.outer, { width: W, transform: [{ scaleY: openScaleY }] }]}
    >
      <View style={[styles.hudFrame, { width: W }]} onLayout={onHudLayout}>
        <ExpoLinearGradient
          colors={['rgba(2, 6, 15, 0.95)', 'rgba(8, 18, 35, 0.95)']}
          style={styles.hudBackground}
        />

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={W} height={frameH}>
            <Defs>
              <Pattern id="slScanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                <Rect x="0" y="0" width="4" height="1" fill="#00e5ff" fillOpacity={0.03} />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width={W} height={frameH} fill="url(#slScanlines)" />
          </Svg>
        </View>

        {/* Glow Bars (Top & Bottom) */}
        <View style={styles.glowBarTop}>
          <ExpoLinearGradient
            colors={['transparent', '#005c99', '#00e5ff', '#ffffff', '#00e5ff', '#005c99', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.glowBarBottom}>
          <ExpoLinearGradient
            colors={['transparent', '#005c99', '#00e5ff', '#ffffff', '#00e5ff', '#005c99', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Inner Box with Brackets */}
        <View style={styles.innerBox}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />

          <View style={styles.headerBlock}>
            <Animated.View style={[styles.headerRow, { opacity: titlePulse }]}>
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

          <View style={styles.body}>{children}</View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: 'center',
    position: 'relative',
  },
  hudFrame: {
    backgroundColor: 'transparent',
    overflow: 'visible', // Ensure glow bars spill out
  },
  hudBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 18, 35, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  glowBarTop: {
    position: 'absolute',
    top: -2,
    left: '-5%',
    width: '110%',
    height: 5,
    zIndex: 20,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  glowBarBottom: {
    position: 'absolute',
    bottom: -2,
    left: '-5%',
    width: '110%',
    height: 5,
    zIndex: 20,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  innerBox: {
    margin: 6,
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.15)',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderColor: 'rgba(0, 210, 255, 0.8)',
    borderWidth: 0,
  },
  tl: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  tr: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  bl: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },
  
  headerBlock: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 25,
    position: 'relative',
    paddingHorizontal: 8, // slight padding so it doesn't rub walls
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexShrink: 1, // ensure it doesn't break out of bounds
    maxWidth: '100%', // Prevent expanding beyond the header block
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
    flexShrink: 1, // lets title shrink if it needs to
  },
  headerTitle: {
    color: '#e6ffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    letterSpacing: 2, // reduced letter spacing to help it fit
    textAlign: 'center',
    textShadowColor: 'rgba(0, 210, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    textTransform: 'uppercase',
  },
  body: {
    width: '100%',
  },
});
