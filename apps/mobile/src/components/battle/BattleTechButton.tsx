import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';

export interface BattleTechButtonProps {
  icon?: LucideIcon;
  label?: string;
  color: string;
  neonColor: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function BattleTechButton({
  icon: Icon,
  label,
  color,
  neonColor,
  onPress,
  disabled,
  style,
}: BattleTechButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.techBtnContainer, style, disabled && { opacity: 0.5 }]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.techBtnBorder, { borderColor: color, shadowColor: neonColor, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5 }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
        />
        <View style={styles.techBtnShine} />
        <View style={styles.techBtnInner}>
          {Icon && <Icon size={20} color={color} />}
          {label && (
            <Text style={[styles.techBtnText, { color, textShadowColor: neonColor, textShadowRadius: 5 }]}>
              {label}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  techBtnContainer: {
    flex: 1,
    height: 40,
  },
  techBtnBorder: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  techBtnShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.5)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  techBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  techBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
});
