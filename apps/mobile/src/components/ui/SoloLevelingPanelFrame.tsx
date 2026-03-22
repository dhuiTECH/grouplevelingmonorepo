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
  const W = Math.min(winW - 24, 380);
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
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={W} height={frameH}>
            <Defs>
              <Pattern id="slScanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                <Rect x="0" y="0" width="4" height="1" fill="#00d2ff" fillOpacity={0.05} />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width={W} height={frameH} fill="url(#slScanlines)" />
          </Svg>
        </View>

        <View style={[styles.sideAccent, { left: 0 }]} />
        <View style={[styles.sideAccent, { right: 0 }]} />

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={W} height={frameH}>
            <Path
              d="M 15 35 L 15 15 L 35 15"
              fill="none"
              stroke="#00d2ff"
              strokeWidth="2"
              opacity={0.8}
            />
            <Path
              d={`M ${W - 15} 35 L ${W - 15} 15 L ${W - 35} 15`}
              fill="none"
              stroke="#00d2ff"
              strokeWidth="2"
              opacity={0.8}
            />
            <Path
              d={`M 15 ${frameH - 35} L 15 ${frameH - 15} L 35 ${frameH - 15}`}
              fill="none"
              stroke="#00d2ff"
              strokeWidth="2"
              opacity={0.8}
            />
            <Path
              d={`M ${W - 15} ${frameH - 35} L ${W - 15} ${frameH - 15} L ${W - 35} ${frameH - 15}`}
              fill="none"
              stroke="#00d2ff"
              strokeWidth="2"
              opacity={0.8}
            />
            <Line x1="0" y1={frameH / 2} x2="6" y2={frameH / 2} stroke="#00d2ff" strokeWidth="2" />
            <Line x1={W} y1={frameH / 2} x2={W - 6} y2={frameH / 2} stroke="#00d2ff" strokeWidth="2" />
          </Svg>
        </View>

        <View style={styles.headerBlock}>
          <Animated.View
            style={[
              styles.headerRow,
              { opacity: titlePulse, maxWidth: W - 48 },
            ]}
          >
            {/* Solo Leveling style: separate square (icon) + rectangle (title), not one combined box */}
            <View style={styles.iconSquareFrame}>
              <View style={styles.exclamationCircle}>
                <Text style={styles.exclamationText}>!</Text>
              </View>
            </View>
            <View style={[styles.titleTextFrame, { maxWidth: W - 48 - ICON_FRAME - ROW_GAP }]}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {title}
              </Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.body}>{children}</View>
      </View>

      <View style={[styles.mechBorderTop, { width: W }]} pointerEvents="none">
        <ExpoLinearGradient
          colors={['transparent', '#00d2ff', '#e6ffff', '#00d2ff', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.mechInnerLine, styles.mechInnerLineTop]} />
      </View>

      <View style={[styles.mechBorderBottom, { width: W }]} pointerEvents="none">
        <ExpoLinearGradient
          colors={['transparent', '#00d2ff', '#e6ffff', '#00d2ff', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.mechInnerLine, styles.mechInnerLineBot]} />
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
    backgroundColor: 'rgba(4, 12, 28, 0.95)',
    borderColor: 'rgba(0, 210, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  sideAccent: {
    position: 'absolute',
    top: 40,
    bottom: 40,
    width: 1,
    backgroundColor: 'rgba(0, 210, 255, 0.4)',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    zIndex: 10,
  },
  mechBorderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    zIndex: 20,
  },
  mechBorderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    zIndex: 20,
  },
  mechInnerLine: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    height: 1,
    backgroundColor: '#00d2ff',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  mechInnerLineTop: { top: 3 },
  mechInnerLineBot: { bottom: 3 },
  headerBlock: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 4,
    gap: ROW_GAP,
  },
  iconSquareFrame: {
    width: ICON_FRAME,
    height: ICON_FRAME,
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
  exclamationCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  exclamationText: {
    color: '#FFFFFF',
    fontFamily: 'Lato-Black',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    textShadowColor: '#a5f3fc',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    transform: [{ scaleY: 1.38 }, { translateY: -1 }],
  },
  titleTextFrame: {
    minHeight: ICON_FRAME,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.75)',
    backgroundColor: 'rgba(2, 12, 32, 0.92)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    flexShrink: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Lato-Black',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: '#22d3ee',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    textTransform: 'uppercase',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    width: '100%',
  },
});
