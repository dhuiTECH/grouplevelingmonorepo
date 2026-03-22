import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Easing,
  StyleProp,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type CyberButtonProps = {
  onPress: () => void;
  text: string;
  loading?: boolean;
  color?: string;
  shadowColor?: string;
  disabled?: boolean;
  backgroundImage?: ImageSourcePropType;
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
  radiate?: boolean;
};

export function CyberButton({
  onPress,
  text,
  loading,
  color = '#2563eb',
  shadowColor = '#1e3a8a',
  disabled,
  backgroundImage,
  width,
  height,
  style,
  radiate,
}: CyberButtonProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (radiate && !disabled) {
      Animated.loop(
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [radiate, disabled, glowAnim]);

  const onLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setLayout({ width: w, height: h });
  };

  const beamX = glowAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-20, layout.width - 20, layout.width - 20, -20, -20],
  });

  const beamY = glowAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-20, -20, layout.height - 20, layout.height - 20, -20],
  });

  const beamOpacity = glowAnim.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      onLayout={onLayout}
      disabled={disabled || loading}
      style={[
        styles.cyberBtn,
        width != null && { width },
        height != null && { height },
        {
          backgroundColor: backgroundImage ? 'transparent' : color,
          borderBottomColor: backgroundImage ? 'transparent' : shadowColor,
          borderBottomWidth: backgroundImage ? 0 : 4,
          shadowColor: radiate && !disabled ? '#00e5ff' : 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: radiate && !disabled ? 0.5 : 0,
          shadowRadius: radiate && !disabled ? 12 : 0,
          elevation: radiate && !disabled ? 8 : 0,
        },
        disabled && styles.cyberBtnDisabled,
        style,
      ]}
    >
      {radiate && !disabled && layout.width > 0 && (
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 4 }]}>
          <Animated.View
            style={{
              position: 'absolute',
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#22d3ee',
              opacity: beamOpacity,
              transform: [{ translateX: beamX }, { translateY: beamY }],
              shadowColor: '#22d3ee',
              shadowRadius: 15,
              shadowOpacity: 1,
              zIndex: 2,
            }}
          >
            <LinearGradient
              colors={['rgba(34, 211, 238, 1)', 'rgba(34, 211, 238, 0)']}
              style={{ flex: 1, borderRadius: 20 }}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
        </View>
      )}

      {backgroundImage ? (
        <Image
          source={backgroundImage}
          style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', borderRadius: 4 }}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={color === 'green' ? ['#16a34a', '#15803d'] : ['#2563eb', '#1d4ed8']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 }}>
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.cyberBtnText}>PROCESSING...</Text>
          </View>
        ) : (
          <Text style={styles.cyberBtnText}>{text}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cyberBtn: {
    width: '100%',
    height: 50,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
  },
  cyberBtnDisabled: { opacity: 0.5, borderBottomWidth: 0, transform: [{ translateY: 4 }] },
  cyberBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 3 },
});
