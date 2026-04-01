import React, { ReactNode, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Rect, Defs, Pattern } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { SystemWindowHeader, SYSTEM_MECH_GLOW_GRADIENT_COLORS } from '@/components/ui/SystemWindowHeader';

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
            colors={SYSTEM_MECH_GLOW_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.glowBarBottom}>
          <ExpoLinearGradient
            colors={SYSTEM_MECH_GLOW_GRADIENT_COLORS}
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

          <SystemWindowHeader title={title} />

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

  body: {
    width: '100%',
  },
});
