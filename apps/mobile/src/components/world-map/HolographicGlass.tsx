import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface HolographicGlassProps {
  children: React.ReactNode;
  style?: any;
  contentStyle?: any;
  hideGlow?: boolean;
}

export const HolographicGlass = ({ children, style, contentStyle, hideGlow }: HolographicGlassProps) => {
  return (
    <View style={[styles.glassWrapper, style]}>
      {/* 1. Background glow - only if not hidden */}
      {!hideGlow && <View style={styles.glowShadow} />}
      
      {/* 2. Glass Blur Background */}
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* 3. Holographic Gradient Background */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.05)', 'rgba(0, 229, 255, 0.02)', 'rgba(0, 0, 0, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* 4. ACTUAL CONTENT (Normal Flow) */}
      <View style={[styles.gradientSurface, contentStyle]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  glassWrapper: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(0, 229, 255, 0.15)',
    borderBottomColor: 'rgba(0, 229, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  glowShadow: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#00E5FF',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  gradientSurface: {
    padding: 24,
    alignItems: 'center',
  },
});
