import React, { useEffect } from 'react';
import { Text, StyleSheet, View, TextStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  Easing,
  withDelay
} from 'react-native-reanimated';

interface GlitchTextProps {
  text: string;
  style?: TextStyle;
  color?: string; // Main text color (White)
  shadowColor?: string; // The glitch color (Cyan/Red)
}

export const GlitchText: React.FC<GlitchTextProps> = ({ 
  text, 
  style, 
  color = '#FFFFFF', 
  shadowColor = '#00E0FF' 
}) => {
  // Shared values for the shake effect
  const shakeX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // 1. The Shake Animation (Random jitter)
    const runGlitch = () => {
      shakeX.value = withSequence(
        withTiming(-2, { duration: 50 }),
        withTiming(2, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(0, { duration: 50 }),
        withDelay(Math.random() * 500 + 500, withTiming(0)) // Wait 0.5-1s before next glitch
      );
      
      // 2. The Opacity Flicker (System failure look)
      opacity.value = withSequence(
        withTiming(0.8, { duration: 50 }),
        withTiming(1, { duration: 50 })
      );
    };

    // Run the glitch loop continuously
    const interval = setInterval(runGlitch, 1000);
    return () => clearInterval(interval);
  }, []);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
    opacity: opacity.value,
  }));

  // The "Ghost" text that creates the color split
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value * 2 }], // Moves more than main text
    opacity: opacity.value * 0.5,
  }));

  return (
    <View style={styles.container}>
      {/* 1. The Cyan/Blue Ghost (Behind) */}
      <Animated.Text style={[style, styles.ghostText, ghostStyle, { color: shadowColor, left: -2 }]}>
        {text}
      </Animated.Text>

      {/* 2. The Red Ghost (Behind) */}
      <Animated.Text style={[style, styles.ghostText, ghostStyle, { color: '#FF0000', left: 2, opacity: 0.4 }]}>
        {text}
      </Animated.Text>

      {/* 3. The Main Text (Front) */}
      <Animated.Text style={[style, styles.mainText, { color }, animatedStyle]}>
        {text}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainText: {
    zIndex: 2,
    fontWeight: '900', // Make sure to use a thick font!
    textTransform: 'uppercase',
  },
  ghostText: {
    position: 'absolute',
    zIndex: 1,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
