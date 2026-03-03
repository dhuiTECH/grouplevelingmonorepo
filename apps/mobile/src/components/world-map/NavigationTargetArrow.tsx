import React from 'react';
import { Text } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { worldMapStyles } from '@/screens/WorldMapScreen.styles';

interface NavigationTargetArrowProps {
  target: { x: number; y: number } | null;
  playerX: number;
  playerY: number;
}

export function NavigationTargetArrow({ target, playerX, playerY }: NavigationTargetArrowProps) {
  if (!target) return null;

  const angleDeg = (Math.atan2(target.x - playerX, target.y - playerY) * 180) / Math.PI;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      style={worldMapStyles.compassContainer}
    >
      <Ionicons
        name="arrow-up"
        size={24}
        color="#facc15"
        style={{ transform: [{ rotate: `${angleDeg}deg` }] }}
      />
      <Text style={worldMapStyles.compassText}>
        🎯 BOSS DETECTED: {target.x}, {target.y}
      </Text>
    </MotiView>
  );
}
