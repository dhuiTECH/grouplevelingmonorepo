import React, { useEffect, useRef, useState, useId } from 'react';
import { View, StyleSheet, Animated, Easing, Text } from 'react-native';
import Svg, { Circle, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';

const COIN = 80;
const VB = 80;

export type CoinFlipState = 'hidden' | 'flipping' | 'win' | 'lose';

interface CoinFlipOverlayProps {
  flipState: CoinFlipState;
  onComplete?: () => void;
}

/** Both faces are circular coins; heads = gold + star, tails = silver + X + dashed inner ring. */
function CoinHeadsSvg({ gid }: { gid: string }) {
  const gradId = `${gid}-hg`;
  return (
    <Svg width={COIN} height={COIN} viewBox={`0 0 ${VB} ${VB}`}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fcd34d" />
          <Stop offset="1" stopColor="#d97706" />
        </LinearGradient>
      </Defs>
      <Circle cx={40} cy={40} r={36} fill={`url(#${gradId})`} stroke="#fef3c7" strokeWidth={3} />
      <Circle cx={40} cy={40} r={28} fill="none" stroke="#b45309" strokeWidth={1.5} opacity={0.85} />
      <Path
        d="M40 18l4 10 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z"
        fill="#78350f"
      />
    </Svg>
  );
}

function CoinTailsSvg({ gid }: { gid: string }) {
  const gradId = `${gid}-ts`;
  return (
    <Svg width={COIN} height={COIN} viewBox={`0 0 ${VB} ${VB}`}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#e2e8f0" />
          <Stop offset="1" stopColor="#64748b" />
        </LinearGradient>
      </Defs>
      <Circle cx={40} cy={40} r={36} fill={`url(#${gradId})`} stroke="#f8fafc" strokeWidth={3} />
      <Circle
        cx={40}
        cy={40}
        r={28}
        fill="none"
        stroke="#475569"
        strokeWidth={1.5}
        strokeDasharray="4 5"
      />
      <G stroke="#1e293b" strokeWidth={4} strokeLinecap="round">
        <Path d="M28 32 L52 56" />
        <Path d="M52 32 L28 56" />
      </G>
    </Svg>
  );
}

const FLIP_HALF_MS = 110;

export function CoinFlipOverlay({ flipState, onComplete }: CoinFlipOverlayProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const scaleX = useRef(new Animated.Value(1)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [showHeads, setShowHeads] = useState(true);
  const flipStateRef = useRef(flipState);
  flipStateRef.current = flipState;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (flipState === 'hidden') {
      scaleX.stopAnimation();
      jump.stopAnimation();
      overlayOpacity.stopAnimation();
      scaleX.setValue(1);
      jump.setValue(0);
      overlayOpacity.setValue(1);
      setShowHeads(true);
      return;
    }

    if (flipState === 'flipping') {
      scaleX.stopAnimation();
      jump.stopAnimation();
      overlayOpacity.stopAnimation();
      overlayOpacity.setValue(1);
      scaleX.setValue(1);
      jump.setValue(0);
      let cancelled = false;

      Animated.timing(jump, {
        toValue: -120,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

      const runFlip = () => {
        if (cancelled || flipStateRef.current !== 'flipping') return;
        Animated.timing(scaleX, {
          toValue: 0,
          duration: FLIP_HALF_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished || cancelled || flipStateRef.current !== 'flipping') return;
          setShowHeads((h) => !h);
          Animated.timing(scaleX, {
            toValue: 1,
            duration: FLIP_HALF_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start(({ finished: f2 }) => {
            if (!f2 || cancelled || flipStateRef.current !== 'flipping') return;
            runFlip();
          });
        });
      };

      runFlip();
      return () => {
        cancelled = true;
      };
    }

    if (flipState === 'win' || flipState === 'lose') {
      scaleX.stopAnimation();
      jump.stopAnimation();
      overlayOpacity.stopAnimation();
      overlayOpacity.setValue(1);
      const wantHeads = flipState === 'win';

      Animated.timing(jump, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.bounce),
        useNativeDriver: true,
      }).start();

      Animated.timing(scaleX, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setShowHeads(wantHeads);
        Animated.timing(scaleX, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          setTimeout(() => {
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: 360,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(() => {
              onCompleteRef.current?.();
            });
          }, 900);
        });
      });
    }
  }, [flipState, scaleX, jump, overlayOpacity]);

  if (flipState === 'hidden') return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.coinWrapper,
            {
              transform: [{ translateY: jump }, { scaleX }],
            },
          ]}
        >
          {showHeads ? <CoinHeadsSvg gid={uid} /> : <CoinTailsSvg gid={uid} />}
        </Animated.View>

        <Text style={styles.text}>
          {flipState === 'flipping'
            ? 'FLIPPING...'
            : flipState === 'win'
              ? 'HEADS! YOU WIN'
              : 'TAILS! YOU LOSE'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    width: 240,
    height: 280,
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  coinWrapper: {
    width: COIN,
    height: COIN,
    marginBottom: 20,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'Exo2-Bold',
    textAlign: 'center',
  },
});
