import type { SharedValue } from 'react-native-reanimated';
import { Easing, withSequence, withTiming } from 'react-native-reanimated';

export type WeaponAttackPresetId =
  | 'sword'
  | 'spear'
  | 'bow'
  | 'shield'
  | 'wand'
  | 'caster'
  | 'allAround';

export interface WeaponGripAttackShared {
  rot: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  sc: SharedValue<number>;
}

/** Drive shared values for one attack pulse (call from useEffect when attackKey changes). */
export function runWeaponGripAttack(
  preset: WeaponAttackPresetId,
  durationMs: number,
  v: WeaponGripAttackShared
): void {
  const d = Math.max(160, durationMs);
  const t1 = Math.round(d * 0.28);
  const t2 = Math.round(d * 0.32);
  const t3 = Math.max(80, d - t1 - t2);
  /** Rot/scale recover slightly before position (spear / allAround only). */
  const t3Rot = Math.max(70, Math.round(t3 * 0.48));
  const ease = Easing.out(Easing.cubic);
  const easeIn = Easing.in(Easing.quad);
  const easeInOut = Easing.inOut(Easing.cubic);
  const settleDrift = Easing.out(Easing.quad);

  v.rot.value = 0;
  v.tx.value = 0;
  v.ty.value = 0;
  v.sc.value = 1;

  switch (preset) {
    case 'sword':
      // Restored: wind-back → downward chop → settle (single recovery curve on all channels).
      v.rot.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-64, { duration: t1, easing: ease }),
        withTiming(52, { duration: t2, easing: easeIn }),
        withTiming(0, { duration: t3, easing: ease })
      );
      v.tx.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-6, { duration: t1, easing: ease }),
        withTiming(18, { duration: t2, easing: easeIn }),
        withTiming(0, { duration: t3 })
      );
      v.ty.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-4, { duration: t1, easing: ease }),
        withTiming(58, { duration: t2, easing: easeIn }),
        withTiming(0, { duration: t3, easing: ease })
      );
      v.sc.value = withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1, { duration: t1 }),
        withTiming(1.04, { duration: t2, easing: easeIn }),
        withTiming(1, { duration: t3, easing: ease })
      );
      break;
    case 'spear':
      v.tx.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(8, { duration: t1, easing: easeInOut }),
        withTiming(24, { duration: t2, easing: easeInOut }),
        withTiming(0, { duration: t3, easing: settleDrift })
      );
      v.ty.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(4, { duration: t1, easing: easeInOut }),
        withTiming(34, { duration: t2, easing: easeInOut }),
        withTiming(0, { duration: t3, easing: settleDrift })
      );
      v.rot.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(4, { duration: t1, easing: easeInOut }),
        withTiming(10, { duration: t2, easing: easeInOut }),
        withTiming(0, { duration: t3Rot, easing: ease })
      );
      break;
    case 'bow':
      v.tx.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-10, { duration: t1, easing: Easing.inOut(Easing.sin) }),
        withTiming(12, { duration: t2, easing: ease }),
        withTiming(0, { duration: t3 })
      );
      v.rot.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-12, { duration: t1, easing: Easing.inOut(Easing.sin) }),
        withTiming(14, { duration: t2, easing: ease }),
        withTiming(0, { duration: t3 })
      );
      break;
    case 'shield':
      v.tx.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(10, { duration: t1, easing: ease }),
        withTiming(-3, { duration: t2 }),
        withTiming(0, { duration: t3 })
      );
      v.rot.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-6, { duration: t1, easing: ease }),
        withTiming(2, { duration: t2 }),
        withTiming(0, { duration: t3 })
      );
      break;
    case 'wand':
      v.rot.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-18, { duration: t1, easing: Easing.inOut(Easing.sin) }),
        withTiming(12, { duration: t2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: t3 })
      );
      v.ty.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-6, { duration: t1, easing: ease }),
        withTiming(2, { duration: t2 }),
        withTiming(0, { duration: t3 })
      );
      break;
    case 'caster':
      v.ty.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-10, { duration: t1, easing: ease }),
        withTiming(3, { duration: t2 }),
        withTiming(0, { duration: t3 })
      );
      v.sc.value = withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1.06, { duration: t1, easing: ease }),
        withTiming(0.98, { duration: t2 }),
        withTiming(1, { duration: t3 })
      );
      break;
    case 'allAround':
    default:
      v.rot.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(8, { duration: t1, easing: easeInOut }),
        withTiming(30, { duration: t2, easing: easeInOut }),
        withTiming(0, { duration: t3Rot, easing: ease })
      );
      v.tx.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(3, { duration: t1, easing: easeInOut }),
        withTiming(12, { duration: t2, easing: easeInOut }),
        withTiming(0, { duration: t3, easing: settleDrift })
      );
      v.ty.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(5, { duration: t1, easing: easeInOut }),
        withTiming(42, { duration: t2, easing: easeInOut }),
        withTiming(0, { duration: t3, easing: settleDrift })
      );
      v.sc.value = withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1, { duration: t1 }),
        withTiming(1.02, { duration: t2, easing: easeInOut }),
        withTiming(1, { duration: t3Rot, easing: ease })
      );
      break;
  }
}
