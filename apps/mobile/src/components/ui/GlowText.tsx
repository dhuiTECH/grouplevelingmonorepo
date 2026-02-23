import React from 'react';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { cn } from '@/utils/cn';
import { MotiView } from 'moti';

interface GlowTextProps {
  children: string;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
  color?: string;
}

export const GlowText = ({ 
  children, 
  className, 
  intensity = 'medium',
  color = '#00E8FF' 
}: GlowTextProps) => {
  const getGlowStyles = () => {
    const radius = intensity === 'low' ? 5 : intensity === 'medium' ? 10 : 20;
    return {
      textShadowColor: color,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: radius,
    };
  };

  return (
    <View className="items-center justify-center">
      <MotiView
        from={{ opacity: 0.7, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: 'timing',
          duration: 1500,
          loop: true,
        }}
      >
        <Text 
          className={cn("font-header text-center", className)}
          style={[styles.text, getGlowStyles(), { color, letterSpacing: 2 }]}
        >
          {children.toUpperCase()}
        </Text>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    ...Platform.select({
      android: {
        // Android text shadow can be finicky, sometimes need elevation or multiple layers
      },
    }),
  },
});