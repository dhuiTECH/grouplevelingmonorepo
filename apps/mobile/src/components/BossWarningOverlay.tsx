import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface BossWarningOverlayProps {
  onComplete: () => void;
  bossName?: string;
}

const STRIP_HEIGHT = 60;
const REPEATED_TEXT = "WARNING // DANGER // WARNING // DANGER // WARNING // DANGER // ";

export default function BossWarningOverlay({ onComplete, bossName }: BossWarningOverlayProps) {
  // Animation Values
  const overlayOpacity = useSharedValue(0);
  const mainTextScale = useSharedValue(3);
  const mainTextOpacity = useSharedValue(0);
  const stripOffset = useSharedValue(width); // Start off-screen
  const stripTextScroll = useSharedValue(0);
  const bossNameOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Background darkens immediately
    overlayOpacity.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withDelay(2400, withTiming(0, { duration: 500 })) // Fade out at end
    );

    // 2. Strips slide in at 0.1s
    stripOffset.value = withDelay(
      100,
      withSequence(
        withTiming(0, { duration: 400, easing: Easing.out(Easing.exp) }), // Slam in
        withDelay(2000, withTiming(width, { duration: 500 })) // Slide out at end
      )
    );

    // 3. Strip text scrolling (continuous)
    stripTextScroll.value = withRepeat(
      withTiming(-width, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );

    // 4. Main WARNING text slams in at 0.5s
    mainTextScale.value = withDelay(
      500,
      withSequence(
        withTiming(1, { duration: 300, easing: Easing.elastic(1.5) }), // Slam scale
        withDelay(1700, withTiming(0, { duration: 500 })) // Shrink out
      )
    );

    mainTextOpacity.value = withDelay(
      500,
      withSequence(
        withTiming(1, { duration: 100 }),
        // Pulse effect
        withRepeat(
          withSequence(
            withTiming(0.6, { duration: 100 }),
            withTiming(1, { duration: 100 })
          ),
          10, // Pulse for about 2 seconds
          true
        ),
        withTiming(0, { duration: 400 })
      )
    );

    // 5. Boss Name fades in slightly later
    if (bossName) {
      bossNameOpacity.value = withDelay(
        800,
        withSequence(
          withTiming(1, { duration: 500 }),
          withDelay(1200, withTiming(0, { duration: 500 }))
        )
      );
    }

    // 6. Cleanup and unmount
    const timeout = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  // Animated Styles
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const topStripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -stripOffset.value }], // Comes from left
  }));

  const bottomStripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: stripOffset.value }], // Comes from right
  }));

  const scrollingTextStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: stripTextScroll.value }],
  }));

  const mainTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mainTextScale.value }],
    opacity: mainTextOpacity.value,
  }));
  
  const bossNameStyle = useAnimatedStyle(() => ({
    opacity: bossNameOpacity.value,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999, justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
      {/* Dark Red Overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#2a0000' }, overlayStyle]} />

      {/* Top Warning Strip */}
      <Animated.View style={[styles.strip, { top: '15%' }, topStripStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 0, 0, 0.8)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ overflow: 'hidden', width: '100%' }}>
           <Animated.View style={[{ flexDirection: 'row', width: width * 3 }, scrollingTextStyle]}>
              <Text style={styles.stripText}>{REPEATED_TEXT + REPEATED_TEXT + REPEATED_TEXT}</Text>
           </Animated.View>
        </View>
      </Animated.View>

      {/* Main Warning Text */}
      <Animated.View style={[styles.centerContainer, mainTextStyle]}>
        <Text style={styles.warningText}>WARNING</Text>
        <Text style={styles.subWarningText}>ENEMY APPROACHING</Text>
      </Animated.View>

      {/* Boss Name */}
      {bossName && (
        <Animated.View style={[styles.bossNameContainer, bossNameStyle]}>
          <Text style={styles.bossNameLabel}>THREAT ANALYSIS:</Text>
          <Text style={styles.bossNameText}>{bossName.toUpperCase()}</Text>
        </Animated.View>
      )}

      {/* Bottom Warning Strip */}
      <Animated.View style={[styles.strip, { bottom: '15%' }, bottomStripStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 0, 0, 0.8)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ overflow: 'hidden', width: '100%' }}>
           <Animated.View style={[{ flexDirection: 'row', width: width * 3 }, scrollingTextStyle]}>
              <Text style={styles.stripText}>{REPEATED_TEXT + REPEATED_TEXT + REPEATED_TEXT}</Text>
           </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    width: '100%',
    height: STRIP_HEIGHT,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ff0000',
  },
  stripText: {
    color: '#ff0000',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    includeFontPadding: false,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  warningText: {
    color: '#ff0000',
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 8,
    textShadowColor: 'rgba(255, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    includeFontPadding: false,
    fontVariant: ['small-caps'], // Cyberpunk feel
  },
  subWarningText: {
    color: '#ffaaaa',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 6,
    marginTop: 10,
    textShadowColor: 'rgba(255, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  bossNameContainer: {
    position: 'absolute',
    bottom: '30%',
    alignItems: 'center',
  },
  bossNameLabel: {
    color: '#ff5555',
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 5,
  },
  bossNameText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    textShadowColor: '#ff0000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
});
