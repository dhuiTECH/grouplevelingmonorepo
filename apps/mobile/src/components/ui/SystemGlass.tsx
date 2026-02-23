import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { cn } from '@/utils/cn';

interface SystemGlassProps {
  children?: React.ReactNode;
  className?: string;
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
}

export const SystemGlass = ({
  children,
  className,
  intensity = 40,
  tint = 'dark'
}: SystemGlassProps) => {
  return (
    <View 
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-aura-indigo/40",
        className
      )}
      style={styles.shadow}
    >
      <BlurView
        intensity={intensity}
        tint={tint}
        className="w-full h-full p-4"
      >
        {children}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.37,
        shadowRadius: 32,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});