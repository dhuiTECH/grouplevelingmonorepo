import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { runWeaponGripAttack, type WeaponAttackPresetId } from './weaponGripAttackPresets';

interface WeaponAttackAnimatedInnerProps {
  children: React.ReactNode;
  attackKey?: number;
  attackPreset: WeaponAttackPresetId | null;
  durationMs: number;
}

/** Inner wrapper: additive rotation / translation / scale on top of static layer positioning. */
export function WeaponAttackAnimatedInner({
  children,
  attackKey,
  attackPreset,
  durationMs,
}: WeaponAttackAnimatedInnerProps) {
  const rot = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sc = useSharedValue(1);

  useEffect(() => {
    if (attackKey == null || attackPreset == null) return;
    runWeaponGripAttack(attackPreset, durationMs, { rot, tx, ty, sc });
  }, [attackKey, attackPreset, durationMs, rot, tx, ty, sc]);

  // Pivot near grip (bottom-center) so rotation reads as a chop, not a cartwheel around the layer center.
  const gripPivot =
    attackPreset === 'wand' || attackPreset === 'bow' || attackPreset === 'caster';

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute' as const,
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      overflow: 'visible' as const,
      transformOrigin: gripPivot ? '50% 50%' : '50% 92%',
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { rotate: `${rot.value}deg` },
        { scale: sc.value },
      ],
    };
  }, [gripPivot]);

  if (attackKey == null || attackPreset == null) {
    return <>{children}</>;
  }

  return (
    <Animated.View style={animatedStyle} pointerEvents="none" collapsable={false}>
      {children}
    </Animated.View>
  );
}
