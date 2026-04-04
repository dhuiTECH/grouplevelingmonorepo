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
      // Wider crescent arc for the 45-degree hand
      v.rot.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-90, { duration: t1, easing: ease }),   // Deeper wind-back
        withTiming(90, { duration: t2, easing: easeIn }),  // Deeper slash down
        withTiming(0, { duration: t3, easing: ease })
      );
      v.tx.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-10, { duration: t1, easing: ease }),   // Pull back
        withTiming(30, { duration: t2, easing: easeIn }),  // Thrust forward during the slash
        withTiming(0, { duration: t3 })
      );
      v.ty.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-10, { duration: t1, easing: ease }),   // Lift up slightly during windup
        withTiming(40, { duration: t2, easing: easeIn }),  // Bring down during strike
        withTiming(0, { duration: t3, easing: ease })
      );
      v.sc.value = withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1, { duration: t1 }),
        withTiming(1.04, { duration: t2, easing: easeIn }),
        withTiming(1, { duration: t3, easing: ease })
      );
      break;
    case 'spear': {
      // Snappier than default t1/t2 split so thrust lines up with hit VFX (short windup, fast thrust).
      const dSpear = Math.min(400, Math.max(200, Math.round(durationMs * 0.68)));
      const tw = Math.round(dSpear * 0.1);
      const th = Math.round(dSpear * 0.24);
      const ts = Math.max(64, dSpear - tw - th);
      const t3RotSpear = Math.max(40, Math.round(ts * 0.4));
      const snapOut = Easing.out(Easing.cubic);
      const thrustEase = Easing.bezier(0.25, 0.1, 0.25, 1);
      v.rot.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-45, { duration: tw, easing: snapOut }),
        withTiming(-45, { duration: th }),
        withTiming(0, { duration: t3RotSpear, easing: ease })
      );
      v.tx.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: tw }),
        withTiming(0, { duration: th }),
        withTiming(0, { duration: ts })
      );
      v.ty.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(8, { duration: tw, easing: snapOut }),
        withTiming(-105, { duration: th, easing: thrustEase }),
        withTiming(0, { duration: ts, easing: settleDrift })
      );
      break;
    }
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
