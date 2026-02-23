import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'cyan' | 'red' | 'glass';
  title?: string;
  icon?: React.ReactNode;
}

const CYBER_CYAN = '#00ffff';
const CYBER_RED = '#ff0000';

export default function Card({
  children,
  style,
  variant = 'default',
  title,
  icon,
}: CardProps) {
  const renderContent = () => (
    <View style={[styles.innerContainer, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      {title && <Text style={styles.title}>{title.toUpperCase()}</Text>}
      {children}
    </View>
  );

  if (variant === 'cyan') {
    return (
      <View style={[styles.card, styles.cyanBorder]}>
        <LinearGradient
          colors={['rgba(0, 255, 255, 0.1)', 'rgba(0, 255, 255, 0.02)']}
          style={styles.gradient}
        >
          {renderContent()}
        </LinearGradient>
      </View>
    );
  }

  if (variant === 'red') {
    return (
      <View style={[styles.card, styles.redBorder]}>
        <LinearGradient
          colors={['rgba(255, 0, 0, 0.1)', 'rgba(255, 0, 0, 0.02)']}
          style={styles.gradient}
        >
          {renderContent()}
        </LinearGradient>
      </View>
    );
  }

  if (variant === 'glass') {
    return (
      <View style={[styles.card, styles.glass]}>
        {renderContent()}
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.default, style]}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  innerContainer: {
    padding: 20,
  },
  gradient: {
    width: '100%',
  },
  default: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
  },
  cyanBorder: {
    borderColor: CYBER_CYAN,
    shadowColor: CYBER_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  redBorder: {
    borderColor: CYBER_RED,
    shadowColor: CYBER_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 1,
  },
});
