import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

export interface HexagonProps {
  size: number;
  color: string;
  fill: boolean;
  fillOpacity?: number;
}

export function Hexagon({ size, color, fill, fillOpacity = 1 }: HexagonProps) {
  const width = size;
  const height = size * 0.866;

  return (
    <View style={[styles.wrapper, { width, height }]}>
      <Svg height={height} width={width} viewBox="0 0 100 87">
        <Polygon
          points="25,0 75,0 100,43.5 75,87 25,87 0,43.5"
          fill={fill ? color : 'transparent'}
          fillOpacity={fill ? fillOpacity : 0}
          stroke={color}
          strokeWidth="8"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
});
