import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Linking, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  external?: boolean;
  variant?: 'primary' | 'secondary' | 'cta' | 'form';
  size?: 'sm' | 'md' | 'lg';
  className?: string; // Kept for interface compatibility
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset'; // Kept for interface compatibility
  disabled?: boolean;
}

const CYBER_CYAN = '#00ffff';
const CYBER_RED = '#ff0000';

export default function Button({
  children,
  href,
  external = false,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  type,
  disabled = false,
}: ButtonProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (disabled) return;

    if (onClick) {
      onClick();
    }

    if (href) {
      if (external) {
        Linking.openURL(href);
      } else {
        // Simple navigation - assumes href matches a route name
        navigation.navigate(href as any);
      }
    }
  };

  const variantStyle = styles[variant] || styles.primary;
  const sizeStyle = styles[size] || styles.md;
  const textStyle = variant === 'secondary' ? styles.secondaryText : styles.primaryText;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        variantStyle,
        sizeStyle,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {typeof children === 'string' ? (
          <Text style={[styles.text, textStyle, size === 'sm' && { fontSize: 12 }]}>
            {children.toUpperCase()}
          </Text>
        ) : (
          children
        )}
        {external && (
          <Feather 
            name="external-link" 
            size={size === 'sm' ? 14 : 18} 
            color={variant === 'secondary' ? '#475569' : '#fff'} 
            style={{ marginLeft: 8 }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  primaryText: {
    color: '#000',
  },
  secondaryText: {
    color: '#fff',
  },
  primary: {
    backgroundColor: CYBER_CYAN,
    borderColor: CYBER_CYAN,
    shadowColor: CYBER_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  secondary: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cta: {
    backgroundColor: CYBER_RED,
    borderColor: CYBER_RED,
    shadowColor: CYBER_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  form: {
    width: '100%',
    backgroundColor: CYBER_CYAN,
    borderColor: CYBER_CYAN,
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  disabled: {
    opacity: 0.5,
  },
});
