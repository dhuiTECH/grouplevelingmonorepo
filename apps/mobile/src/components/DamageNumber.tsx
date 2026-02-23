import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  Keyframe,
  runOnJS 
} from 'react-native-reanimated';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

// Define the "Voidpet Pop" animation
const FloatUp = new Keyframe({
  0: {
    transform: [{ translateY: 0 }, { scale: 0.5 }],
    opacity: 0,
  },
  20: { 
    transform: [{ translateY: -20 }, { scale: 1.5 }], 
    opacity: 1,
  },
  40: { 
    transform: [{ translateY: -25 }, { scale: 1.0 }],
    opacity: 1,
  },
  100: { 
    transform: [{ translateY: -60 }, { scale: 1.0 }],
    opacity: 0,
  },
});

interface DamageNumberProps {
  id: string;
  value: number | string;
  x: number;
  y: number;
  color: string;
  isCrit?: boolean;
  onComplete?: (id: string) => void;
}

export const DamageNumber = React.memo(({ id, value, x, y, color, isCrit, onComplete }: DamageNumberProps) => {
  
  useEffect(() => {
    if (onComplete) {
      const t = setTimeout(() => onComplete(id), 800);
      return () => clearTimeout(t);
    }
  }, [id, onComplete]);

  // Use a thicker stroke for crits
  const strokeWidth = isCrit ? 2.5 : 2;
  const fontSize = isCrit ? 36 : 28;
  const fontWeight = "900";

  return (
    <Animated.View
      entering={FloatUp.duration(800)}
      style={[
        styles.container,
        { left: x, top: y, zIndex: 10000 } 
      ]}
      pointerEvents="none"
    >
      {/* 
        Using SVG Text to achieve the "Game Stroke" effect in Expo Go.
        This mimics native stroke text without needing a custom native module.
      */}
      <Svg height={fontSize * 2} width={120}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="100%">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0.8" />
          </LinearGradient>
        </Defs>
        <SvgText
          fill={color}
          stroke="black"
          strokeWidth={strokeWidth}
          fontSize={fontSize}
          fontWeight={fontWeight}
          x="60"
          y={fontSize}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontStyle="italic"
        >
          {value}
        </SvgText>
      </Svg>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 60,
    marginLeft: -60, // Center horizontally based on width
    marginTop: -30, // Center vertically
  },
});

export default DamageNumber;
