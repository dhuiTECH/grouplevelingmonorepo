import React from 'react';
import { View, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ImpactEffectInstance {
  id: string;
  slashAnim: Animated.Value;
  flashAnim: Animated.Value;
  splashAnim: Animated.Value;
  type: 'SLASH' | 'CIRCLE';
}

interface ImpactEffectsProps {
  impactEffects: ImpactEffectInstance[];
  enemyFigureCenter: { x: number; y: number } | null;
}

export function ImpactEffects({ impactEffects, enemyFigureCenter }: ImpactEffectsProps) {
  return (
    <>
      {impactEffects.map((inst) => {
        const targetX = enemyFigureCenter?.x ?? SCREEN_WIDTH / 2;
        const targetY = enemyFigureCenter?.y ?? 200;

        return (
          <React.Fragment key={inst.id}>
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1795,
                backgroundColor: 'rgba(251, 191, 36, 0.35)',
                opacity: inst.flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              }}
            />
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: targetY - 120,
                left: targetX - 120,
                width: 240,
                height: 240,
                borderRadius: 120,
                borderWidth: 4,
                borderColor: '#fbbf24',
                zIndex: 1798,
                opacity: inst.splashAnim.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0.9, 0.5, 0],
                }),
                transform: [
                  {
                    scale: inst.splashAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 2.2],
                    }),
                  },
                ],
              }}
            />
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: targetY - 80,
                left: targetX - 80,
                width: 160,
                height: 160,
                borderRadius: 80,
                borderWidth: 3,
                borderColor: 'rgba(34, 211, 238, 0.8)',
                zIndex: 1797,
                opacity: inst.splashAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 0.3, 0],
                }),
                transform: [
                  {
                    scale: inst.splashAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 2.5],
                    }),
                  },
                ],
              }}
            />
            {inst.type === 'SLASH' && (
              <Animated.Image
                source={require('@assets/effects/moon_slash.png')}
                style={{
                  position: 'absolute',
                  top: targetY - 100,
                  left: targetX - 100,
                  width: 200,
                  height: 200,
                  zIndex: 1800,
                  opacity: inst.slashAnim.interpolate({
                    inputRange: [0, 0.15, 0.75, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      scale: inst.slashAnim.interpolate({
                        inputRange: [0, 0.2, 0.5, 1],
                        outputRange: [0.5, 1.4, 1.15, 1.25],
                      }),
                    },
                    {
                      rotate: inst.slashAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-15deg', '15deg'],
                      }),
                    },
                  ],
                }}
                resizeMode="contain"
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
