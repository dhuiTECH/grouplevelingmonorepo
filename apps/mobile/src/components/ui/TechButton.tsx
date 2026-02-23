import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { cn } from '@/utils/cn';
import { MotiView } from 'moti';
import { playHunterSound } from '@/utils/audio';

interface TechButtonProps {
  onPress?: () => void;
  title: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent';
  disableSound?: boolean;
}

export const TechButton = ({ onPress, title, className, variant = 'primary', disableSound = false }: TechButtonProps) => {
  const getColors = () => {
    switch (variant) {
      case 'accent': return ['#A78BFA', 'rgba(167, 139, 250, 0.3)']; // Digital Lavender
      case 'secondary': return ['#121214', 'rgba(255, 255, 255, 0.1)']; // Deep Charcoal
      default: return ['#2563EB', 'rgba(37, 99, 235, 0.3)']; // Bright Blue
    }
  };

  const handlePress = () => {
    if (!disableSound) {
      playHunterSound('click');
    }
    onPress?.();
  };

  const [mainColor, glowColor] = getColors();

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={handlePress}
      className={cn("relative h-14 w-full items-center justify-center", className)}
    >
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Path
            d="M 5,0 L 100,0 L 95,100 L 0,100 Z"
            fill={mainColor}
          />
        </Svg>
      </View>
      
      <MotiView
        from={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{
          type: 'timing',
          duration: 2000,
          loop: true,
        }}
        style={[StyleSheet.absoluteFill, styles.glow, { shadowColor: mainColor }]}
      />

      <Text className="text-white font-header font-bold tracking-widest text-lg">
        {title.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  glow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
});