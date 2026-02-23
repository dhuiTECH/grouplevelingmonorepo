import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Svg, { Polygon, LinearGradient, Stop, Path, G, Defs } from 'react-native-svg';

export const SystemPanelBackground = ({ style }: { style?: ViewStyle }) => (
  <Svg
    style={[StyleSheet.absoluteFill, style]}
    viewBox="0 0 260 340"
    preserveAspectRatio="none"
  >
    <Defs>
      {/* Main Panel Gradient */}
      <LinearGradient id="holoBg" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#131524" stopOpacity="1"/>
        <Stop offset="100%" stopColor="#131524" stopOpacity="1"/>
      </LinearGradient>

      <LinearGradient id="borderGlow" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15"/>
        <Stop offset="100%" stopColor="#22d3ee" stopOpacity="0.35"/>
      </LinearGradient>
    </Defs>

    {/* 1. Base Dark Background with chamfers (Clean Gradient) */}
    <Polygon
      points="20,12 240,12 248,20 248,320 240,328 20,328 12,320 12,20"
      fill="url(#holoBg)"
    />

    {/* 6. Continuous Inner Border Frame */}
    <Polygon
      points="20,12 240,12 248,20 248,320 240,328 20,328 12,320 12,20"
      fill="none"
      stroke="url(#borderGlow)"
      strokeWidth="1.5"
      opacity="0.9"
    />
    {/* Glow pass for inner border */}
    <Polygon
      points="20,12 240,12 248,20 248,320 240,328 20,328 12,320 12,20"
      fill="none"
      stroke="#22d3ee"
      strokeWidth="4"
      opacity="0.15"
    />

    {/* 7. Thick Hovering Outer Brackets */}
    <G stroke="#22d3ee" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.12">
      {/* Top Left */}
      <Path d="M 5,60 L 5,16 L 16,5 L 60,5" />
      {/* Top Right */}
      <Path d="M 200,5 L 244,5 L 255,16 L 255,60" />
      {/* Bottom Right */}
      <Path d="M 255,280 L 255,324 L 244,335 L 200,335" />
      {/* Bottom Left */}
      <Path d="M 60,335 L 16,335 L 5,324 L 5,280" />
    </G>

    {/* Solid core for Brackets - muted cyan */}
    <G stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
      <Path d="M 5,60 L 5,16 L 16,5 L 60,5" />
      <Path d="M 200,5 L 244,5 L 255,16 L 255,60" />
      <Path d="M 255,280 L 255,324 L 244,335 L 200,335" />
      <Path d="M 60,335 L 16,335 L 5,324 L 5,280" />
    </G>
  </Svg>
);
