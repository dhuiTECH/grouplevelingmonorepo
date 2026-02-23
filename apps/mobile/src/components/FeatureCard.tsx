import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const CYBER_CYAN = '#00ffff';

export default function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.container}>
      <LinearGradient
        colors={['rgba(0, 255, 255, 0.15)', 'rgba(0, 255, 255, 0.05)']}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        <Text style={styles.description}>{description}</Text>
        
        {/* Cyberpunk corner detail */}
        <View style={styles.corner} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  gradient: {
    padding: 24,
    width: '100%',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: CYBER_CYAN,
    marginBottom: 8,
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  corner: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: CYBER_CYAN,
  },
});
