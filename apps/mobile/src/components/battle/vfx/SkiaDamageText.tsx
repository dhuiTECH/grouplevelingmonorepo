import React from 'react';
import { Canvas, Text, useFont, LinearGradient, vec } from '@shopify/react-native-skia';

interface SkiaDamageProps {
  value: number;
  isCrit?: boolean;
}

export function SkiaDamageText({ value, isCrit = false }: SkiaDamageProps) {
  // MUST USE A CHUNKY FONT
  const font = useFont(require('../../../../assets/fonts/ChunkyBlockFont.ttf'), isCrit ? 48 : 36);

  if (!font) return null;

  const textString = value.toString();
  const textWidth = font.getTextWidth(textString);
  const canvasWidth = 150; 
  const canvasHeight = 80;
  
  const x = (canvasWidth - textWidth) / 2;
  const y = 60;

  // Requested Colors:
  // Normal: White gradient
  // Crit: Magenta to Red gradient (matching image)
  const gradientColors = isCrit 
    ? ['#FF00A2', '#D90000'] // Bright Magenta top, Deep Red bottom
    : ['#FFFFFF', '#E0E0E0']; // Pure White top, slightly shaded bottom

  // Inner highlight stroke (Crit gets a yellow/orange inner stroke in MS, Normal gets grey/none)
  const innerOutlineColor = isCrit ? '#FFEA00' : '#CCCCCC'; 

  return (
    <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
      
      {/* LAYER 1: The massive black outer stroke (The Maple Story signature) */}
      <Text 
        x={x} y={y} text={textString} font={font} 
        style="stroke" strokeWidth={9} color="#000000" strokeJoin="round"
      />
      
      {/* LAYER 2: The thin inner outline */}
      <Text 
        x={x} y={y} text={textString} font={font} 
        style="stroke" strokeWidth={3} color={innerOutlineColor} strokeJoin="round"
      />
      
      {/* LAYER 3: The gradient fill */}
      <Text x={x} y={y} text={textString} font={font}>
        <LinearGradient
          start={vec(0, y - 40)} 
          end={vec(0, y)}        
          colors={gradientColors}
        />
      </Text>
      
    </Canvas>
  );
}
