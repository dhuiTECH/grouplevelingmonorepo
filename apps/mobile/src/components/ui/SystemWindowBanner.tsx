import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Path } from 'react-native-svg';

const W = Math.min(Dimensions.get('window').width - 32, 360);
const H = 88;
const ICON_FRAME = 44;
const ROW_GAP = 8;

type Props = {
  title: string;
  /** Optional right-of-icon content; default is exclamation asset */
  icon?: ReactNode;
};

/**
 * Compact "chest modal" / HunterLog system-window frame for onboarding banners.
 */
export function SystemWindowBanner({ title, icon }: Props) {
  return (
    <View style={styles.outer}>
      <View style={styles.mechBorderTop}>
        <LinearGradient
          colors={['transparent', '#00d2ff', '#e6ffff', '#00d2ff', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.mechInnerLine} />
      </View>

      <View style={styles.mechBorderBottom}>
        <LinearGradient
          colors={['transparent', '#00d2ff', '#e6ffff', '#00d2ff', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.mechInnerLine, { top: undefined, bottom: 3 }]} />
      </View>

      <View style={styles.hudFrame}>
        <View style={[styles.sideAccent, { left: 0 }]} />
        <View style={[styles.sideAccent, { right: 0 }]} />

        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path
            d="M 12 28 L 12 12 L 28 12"
            fill="none"
            stroke="#00d2ff"
            strokeWidth="1.5"
            opacity={0.85}
          />
          <Path
            d={`M ${W - 12} 28 L ${W - 12} 12 L ${W - 28} 12`}
            fill="none"
            stroke="#00d2ff"
            strokeWidth="1.5"
            opacity={0.85}
          />
          <Path
            d={`M 12 ${H - 28} L 12 ${H - 12} L 28 ${H - 12}`}
            fill="none"
            stroke="#00d2ff"
            strokeWidth="1.5"
            opacity={0.85}
          />
          <Path
            d={`M ${W - 12} ${H - 28} L ${W - 12} ${H - 12} L ${W - 28} ${H - 12}`}
            fill="none"
            stroke="#00d2ff"
            strokeWidth="1.5"
            opacity={0.85}
          />
          <Line x1="0" y1={H / 2} x2="5" y2={H / 2} stroke="#00d2ff" strokeWidth="1.5" />
          <Line x1={W} y1={H / 2} x2={W - 5} y2={H / 2} stroke="#00d2ff" strokeWidth="1.5" />
        </Svg>

        <View style={styles.bannerContent}>
          <View style={styles.titleRow}>
            <View style={styles.iconSquareFrame}>
              {icon ?? (
                <Image
                  source={require('../../../assets/exclamation.png')}
                  style={styles.exclamationImgInner}
                  resizeMode="contain"
                />
              )}
            </View>
            <View style={[styles.titleTextFrame, { maxWidth: W - 32 - ICON_FRAME - ROW_GAP }]}>
              <Text style={styles.titleText}>{title}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: W,
    minHeight: H,
    alignSelf: 'center',
  },
  hudFrame: {
    width: '100%',
    minHeight: H,
    backgroundColor: 'rgba(4, 12, 28, 0.95)',
    borderColor: 'rgba(0, 210, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 2,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  sideAccent: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    width: 1,
    backgroundColor: 'rgba(0, 210, 255, 0.35)',
    zIndex: 2,
  },
  mechBorderTop: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    height: 6,
    zIndex: 10,
  },
  mechBorderBottom: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    height: 6,
    zIndex: 10,
  },
  mechInnerLine: {
    position: 'absolute',
    top: 2,
    left: '8%',
    right: '8%',
    height: 1,
    backgroundColor: '#00d2ff',
    opacity: 0.9,
  },
  bannerContent: {
    marginHorizontal: 6,
    marginVertical: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ROW_GAP,
    maxWidth: W - 16,
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
  exclamationImgInner: {
    width: 40,
    height: 40,
  },
  titleTextFrame: {
    minHeight: ICON_FRAME,
    justifyContent: 'center',
    paddingHorizontal: 8,
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
  titleText: {
    color: '#ffffff',
    fontFamily: 'Lato-Black',
    fontSize: 17,
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: '#22d3ee',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textTransform: 'uppercase',
  },
});
