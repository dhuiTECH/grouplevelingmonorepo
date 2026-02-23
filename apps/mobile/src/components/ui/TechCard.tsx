import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { cn } from '@/utils/cn';

interface TechCardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export const TechCard = ({ children, className, style }: TechCardProps) => {
  return (
    <View className={cn("relative p-6", className)} style={style}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#A78BFA" stopOpacity="0.1" />
              <Stop offset="50%" stopColor="#121214" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#00E8FF" stopOpacity="0.05" />
            </LinearGradient>
          </Defs>
          <Path
            d="M 0,0 
               L 100,0 
               L 100,85 
               L 85,100 
               L 0,100 
               Z"
            fill="url(#cardGrad)"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="0.5"
          />
        </Svg>
      </View>
      <View className="relative z-10">
        {children}
      </View>
    </View>
  );
};