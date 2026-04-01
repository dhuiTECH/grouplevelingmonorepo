import React from 'react';
import { Canvas, Text, useFont } from '@shopify/react-native-skia';
import { Exo2_800ExtraBold, Exo2_900Black } from '@expo-google-fonts/exo-2';

/** Match DamageNumberLayer: `left: targetX - DAMAGE_FLOAT_WIDTH / 2` */
export const DAMAGE_FLOAT_WIDTH = 240;
export const DAMAGE_FLOAT_HEIGHT = 92;

interface SkiaDamageProps {
  value: number;
  isCrit?: boolean;
}

/**
 * Action JRPG hit numbers: flat fills, sharp miters, thin outline — not soft “bubble” gradients.
 */
export function SkiaDamageText({ value, isCrit = false }: SkiaDamageProps) {
  const font = useFont(isCrit ? Exo2_900Black : Exo2_800ExtraBold, isCrit ? 44 : 32);

  if (!font) return null;

  const textString = value.toString();
  const textWidth = font.getTextWidth(textString);
  const x = (DAMAGE_FLOAT_WIDTH - textWidth) / 2;
  const y = 62;

  const fill = isCrit ? '#fecaca' : '#e0f2fe';
  const midStroke = isCrit ? '#b91c1c' : '#0e7490';
  const outerStroke = isCrit ? '#450a0a' : '#020617';

  return (
    <Canvas style={{ width: DAMAGE_FLOAT_WIDTH, height: DAMAGE_FLOAT_HEIGHT }}>
      {/* Drop shadow — offset slice, not glow */}
      <Text
        x={x + 2}
        y={y + 3}
        text={textString}
        font={font}
        style="stroke"
        strokeWidth={5}
        color="rgba(0,0,0,0.55)"
        strokeJoin="miter"
      />
      {/* Outer outline */}
      <Text
        x={x}
        y={y}
        text={textString}
        font={font}
        style="stroke"
        strokeWidth={isCrit ? 5 : 4.5}
        color={outerStroke}
        strokeJoin="miter"
      />
      {/* Mid rim for punch-through */}
      <Text
        x={x}
        y={y}
        text={textString}
        font={font}
        style="stroke"
        strokeWidth={isCrit ? 2.2 : 2}
        color={midStroke}
        strokeJoin="miter"
      />
      <Text x={x} y={y} text={textString} font={font} color={fill} />
    </Canvas>
  );
}
