import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { Audio } from 'expo-av';

export interface ImpactEffectInstance {
  id: string;
  slashAnim: Animated.Value;
  flashAnim: Animated.Value;
  splashAnim: Animated.Value;
  type: 'SLASH' | 'CIRCLE';
}

interface UseBattleVisualDamageArgs {
  lastDamageEvent: any;
  lastSkillAnimationConfig: any | null;
  enemy: any | null;
  party: any[];
}

export function useBattleVisualDamage({
  lastDamageEvent,
  lastSkillAnimationConfig,
  enemy,
  party,
}: UseBattleVisualDamageArgs) {
  const [visualEnemyHp, setVisualEnemyHp] = useState(0);
  const [visualPartyHps, setVisualPartyHps] = useState<Record<string, number>>({});
  const [impactEffects, setImpactEffects] = useState<ImpactEffectInstance[]>([]);

  useEffect(() => {
    if (enemy) {
      setVisualEnemyHp((prev) => {
        if (enemy.hp > prev || prev === 0) return enemy.hp;
        return prev;
      });
    }
  }, [enemy?.hp, enemy?.id]);

  useEffect(() => {
    setVisualPartyHps((prev) => {
      const next = { ...prev };
      let changed = false;
      party.forEach((p) => {
        if (p.hp > (prev[p.id] || 0) || prev[p.id] === undefined) {
          next[p.id] = p.hp;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [party]);

  const triggerImpact = (count: number, type: 'SLASH' | 'CIRCLE') => {
    const STAGGER_MS = 220;
    const newInstances: ImpactEffectInstance[] = [];
    for (let i = 0; i < count; i++) {
      const id = `${Date.now()}-${i}-${Math.random()}`;
      const slashAnim = new Animated.Value(0);
      const flashAnim = new Animated.Value(0);
      const splashAnim = new Animated.Value(0);
      newInstances.push({ id, slashAnim, flashAnim, splashAnim, type });

      setTimeout(async () => {
        if (type === 'SLASH') {
          try {
            const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/QUICK_SLASH.mp3'));
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((s) => {
              if (s.isLoaded && 'didJustFinish' in s && s.didJustFinish) sound.unloadAsync();
            });
          } catch {
            /* ignore */
          }
        }
        Animated.parallel([
          Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
          ]),
          Animated.timing(splashAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(slashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start(() => {
          setImpactEffects((prev) => prev.filter((inst) => inst.id !== id));
        });
      }, i * STAGGER_MS);
    }
    setImpactEffects((prev) => [...prev, ...newInstances]);
  };

  const applyVisualHpAndImpactForEvent = useCallback((event: typeof lastDamageEvent) => {
    if (!event) return;

    if (event.targetId === 'ENEMY') {
      setVisualEnemyHp((prev) => Math.max(0, prev - event.value));
    } else {
      setVisualPartyHps((prev) => ({
        ...prev,
        [event.targetId]: Math.max(0, (prev[event.targetId] || 0) - event.value),
      }));
    }

    if (event.targetId === 'ENEMY' && event.value > 0) {
      if (event.skillId || event.abilityName) {
        triggerImpact(1, 'CIRCLE');
      }
    }
  }, []);

  const applyVisualHpRef = useRef(applyVisualHpAndImpactForEvent);
  useEffect(() => {
    applyVisualHpRef.current = applyVisualHpAndImpactForEvent;
  }, [applyVisualHpAndImpactForEvent]);

  const damageTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastScheduledEventTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      Object.values(damageTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const scheduleDamageNumber = useCallback((evt: typeof lastDamageEvent, delay: number) => {
    if (!evt) return;
    const key = evt.timestamp.toString();

    if (damageTimersRef.current[key]) {
      clearTimeout(damageTimersRef.current[key]);
    }

    const t = setTimeout(() => {
      applyVisualHpRef.current(evt);
      delete damageTimersRef.current[key];
    }, delay);

    damageTimersRef.current[key] = t;
  }, []);

  useEffect(() => {
    if (!lastDamageEvent) return;
    const isSkillHit = lastDamageEvent.skillId != null || lastDamageEvent.abilityName != null;
    if (!isSkillHit) {
      applyVisualHpRef.current(lastDamageEvent);
    }
  }, [lastDamageEvent]);

  useEffect(() => {
    if (!lastDamageEvent) return;
    const isSkillHit = lastDamageEvent.skillId != null || lastDamageEvent.abilityName != null;
    if (!isSkillHit) return;

    if (lastScheduledEventTimestampRef.current === lastDamageEvent.timestamp) return;
    lastScheduledEventTimestampRef.current = lastDamageEvent.timestamp;

    const durationMs = lastSkillAnimationConfig?.duration_ms ?? 500;
    const perHit = lastDamageEvent.damagePerHit;
    const playCount = lastDamageEvent.skillUseCount ?? 1;
    const multiResults = lastDamageEvent.multiResults;
    const vfxType = lastSkillAnimationConfig?.vfx_type ?? 'impact';
    const totalDuration = durationMs * playCount;

    if (multiResults && multiResults.length > 0) {
      multiResults.forEach((result: any, i: number) => {
        const syntheticEvent = {
          ...lastDamageEvent,
          targetId: result.targetId,
          value: result.value,
          type: result.type,
          timestamp: lastDamageEvent.timestamp + i * 50,
        };
        let delay = 100;

        if (vfxType === 'projectile') {
          delay = totalDuration;
        } else if (vfxType === 'beam' || vfxType === 'aoe') {
          delay = 100;
        }

        scheduleDamageNumber(syntheticEvent, delay + i * 50);
      });
    } else if (perHit && perHit.length > 0) {
      perHit.forEach((value: number, i: number) => {
        const syntheticEvent = { ...lastDamageEvent, value, timestamp: lastDamageEvent.timestamp + i };
        let delay = i * durationMs;

        if (vfxType === 'projectile') {
          delay = totalDuration + i * 100;
        } else {
          delay = i * durationMs + 100;
        }

        scheduleDamageNumber(syntheticEvent, delay);
      });
    } else {
      let delay = durationMs;
      if (vfxType === 'projectile') {
        delay = totalDuration;
      } else if (vfxType === 'beam' || vfxType === 'aoe') {
        delay = 100;
      }
      scheduleDamageNumber(lastDamageEvent, delay);
    }
  }, [lastDamageEvent, lastSkillAnimationConfig, scheduleDamageNumber]);

  return {
    visualEnemyHp,
    visualPartyHps,
    impactEffects,
  };
}
