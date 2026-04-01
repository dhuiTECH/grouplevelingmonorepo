import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

/** Energy / calories */
export const FlameIcon: React.FC<IconProps> = ({
  size = 24,
  color = "#f97316",
  strokeWidth = 2,
  style,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </Svg>
);

/** Protein */
export const BeefIcon: React.FC<IconProps> = ({
  size = 24,
  color = "#ef4444",
  strokeWidth = 2,
  style,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <Circle cx="12.5" cy="8.5" r="2.5" />
    <Path d="M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3A6.5 6.5 0 0 0 12.5 2Z" />
    <Path d="m18.5 6 2.19 3.42c.36.56.58 1.2.64 1.88.2 2.12-1.38 4.67-4.14 6.28-3.05 1.78-6.9 2.15-9.19 2.15-1.94 0-3.34-.78-4.22-2.1" />
  </Svg>
);

/** Carbs */
export const WheatIcon: React.FC<IconProps> = ({
  size = 24,
  color = "#eab308",
  strokeWidth = 2,
  style,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <Path d="M2 22 22 2" />
    <Path d="M16 4.4c.9 1 2.3 1.5 3.6 1.4-1.2-1.3-1.6-3.2-.8-4.8l-2.6 2.6c-.6.6-.7 1.5-.2 2.2Z" />
    <Path d="M13.2 7.2c.9 1 2.3 1.5 3.6 1.4-1.2-1.3-1.6-3.2-.8-4.8l-2.6 2.6c-.6.6-.7 1.5-.2 2.2Z" />
    <Path d="M10.4 10c.9 1 2.3 1.5 3.6 1.4-1.2-1.3-1.6-3.2-.8-4.8l-2.6 2.6c-.6.6-.7 1.5-.2 2.2Z" />
    <Path d="M7.6 12.8c.9 1 2.3 1.5 3.6 1.4-1.2-1.3-1.6-3.2-.8-4.8l-2.6 2.6c-.6.6-.7 1.5-.2 2.2Z" />
    <Path d="M4.8 15.6c.9 1 2.3 1.5 3.6 1.4-1.2-1.3-1.6-3.2-.8-4.8l-2.6 2.6c-.6.6-.7 1.5-.2 2.2Z" />
    <Path d="M4.4 16c-1-.9-1.5-2.3-1.4-3.6 1.3 1.2 3.2 1.6 4.8.8l-2.6-2.6c-.6-.6-1.5-.7-2.2-.2Z" />
    <Path d="M7.2 13.2c-1-.9-1.5-2.3-1.4-3.6 1.3 1.2 3.2 1.6 4.8.8l-2.6-2.6c-.6-.6-1.5-.7-2.2-.2Z" />
    <Path d="M10 10.4c-1-.9-1.5-2.3-1.4-3.6 1.3 1.2 3.2 1.6 4.8.8l-2.6-2.6c-.6-.6-1.5-.7-2.2-.2Z" />
    <Path d="M12.8 7.6c-1-.9-1.5-2.3-1.4-3.6 1.3 1.2 3.2 1.6 4.8.8l-2.6-2.6c-.6-.6-1.5-.7-2.2-.2Z" />
    <Path d="M15.6 4.8c-1-.9-1.5-2.3-1.4-3.6 1.3 1.2 3.2 1.6 4.8.8l-2.6-2.6c-.6-.6-1.5-.7-2.2-.2Z" />
  </Svg>
);

/** Fats */
export const DropletsIcon: React.FC<IconProps> = ({
  size = 24,
  color = "#3b82f6",
  strokeWidth = 2,
  style,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <Path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7 6.64 7 5.3c0 1.34-1.15 2.42-2.29 3.36C3.57 9.59 3 10.7 3 11.85c0 2.22 1.8 4.05 4 4.05z" />
    <Path d="M17 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S17 6.64 17 5.3c0 1.34-1.15 2.42-2.29 3.36C12.57 9.59 12 10.7 12 11.85c0 2.22 1.8 4.05 4 4.05z" />
  </Svg>
);
