import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing, runOnJS, withDelay } from 'react-native-reanimated';
import { useBattleStore } from '@/store/useBattleStore';
import { SkiaDamageText, DAMAGE_FLOAT_WIDTH, DAMAGE_FLOAT_HEIGHT } from './SkiaDamageText';

// A single damage number animated node
function DamageNode({ 
  id, 
  value, 
  isCrit, 
  xOffset, 
  yOffset,
  targetX,
  targetY
}: { 
  id: string, 
  value: number, 
  isCrit: boolean, 
  xOffset: number, 
  yOffset: number,
  targetX: number,
  targetY: number
}) {
  const removeDamageNumber = useBattleStore(state => state.removeDamageNumber);
  
  const translateY = useSharedValue(yOffset);
  const scale = useSharedValue(0.88);
  const rotateDeg = useSharedValue(isCrit ? -5 : -2.5);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const peak = isCrit ? 1.12 : 1.06;
    // Impact snap (no spring bounce): quick overshoot then settle
    scale.value = withSequence(
      withTiming(peak, { duration: 50, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 85, easing: Easing.out(Easing.cubic) })
    );
    rotateDeg.value = withSequence(
      withTiming(0, { duration: 65, easing: Easing.out(Easing.cubic) }),
      withTiming(isCrit ? 2 : 0.6, { duration: 180, easing: Easing.inOut(Easing.quad) })
    );

    translateY.value = withTiming(yOffset - 52, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });

    opacity.value = withDelay(
      720,
      withTiming(0, { duration: 320 }, (finished) => {
        if (finished) runOnJS(removeDamageNumber)(id);
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: xOffset },
      { rotate: `${rotateDeg.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[
      styles.damageNode,
      {
        left: targetX - DAMAGE_FLOAT_WIDTH / 2,
        top: targetY - DAMAGE_FLOAT_HEIGHT / 2,
      },
      animatedStyle
    ]} pointerEvents="none">
      <SkiaDamageText value={value} isCrit={isCrit} />
    </Animated.View>
  );
}

export function DamageNumberLayer({ enemyFigureCenter }: { enemyFigureCenter: { x: number, y: number } | null }) {
  const activeDamageNumbers = useBattleStore(state => state.activeDamageNumbers);
  const lastDamageEvent = useBattleStore(state => state.lastDamageEvent);
  const addDamageNumber = useBattleStore(state => state.addDamageNumber);

  // Staggered Spawning logic
  useEffect(() => {
    if (!lastDamageEvent || lastDamageEvent.type !== 'damage') return;

    // Use damagePerHit if available for multi-hit skills, otherwise fallback to multiResults or single value
    const hitsToSpawn: { value: number, targetId: string }[] = [];
    
    if (lastDamageEvent.damagePerHit && lastDamageEvent.damagePerHit.length > 0) {
      lastDamageEvent.damagePerHit.forEach(val => {
        if (val > 0) hitsToSpawn.push({ value: val, targetId: lastDamageEvent.targetId });
      });
    } else if (lastDamageEvent.multiResults && lastDamageEvent.multiResults.length > 0) {
      lastDamageEvent.multiResults.forEach(res => {
        if (res.type === 'damage' && res.value > 0) hitsToSpawn.push({ value: res.value, targetId: res.targetId });
      });
    } else if (lastDamageEvent.value > 0) {
      hitsToSpawn.push({ value: lastDamageEvent.value, targetId: lastDamageEvent.targetId });
    }

    hitsToSpawn.forEach((hit, index) => {
      // Simulate crit visually (e.g. 20% chance to be a CRIT color)
      const isCrit = Math.random() > 0.8;
      
      setTimeout(() => {
        addDamageNumber(hit.value, isCrit, hit.targetId);
      }, index * 80); // The satisfying machine-gun cascade
    });
  }, [lastDamageEvent?.timestamp]);

  // Default targets for when coordinates aren't fully resolved yet
  const defaultEnemyX = enemyFigureCenter ? enemyFigureCenter.x : 200;
  const defaultEnemyY = enemyFigureCenter ? enemyFigureCenter.y : 220;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {activeDamageNumbers.map(dn => {
        // Here we could calculate specific target coordinates based on `dn.targetId`
        // For simplicity, we center around the enemy by default.
        const targetX = defaultEnemyX;
        const targetY = defaultEnemyY;

        return (
          <DamageNode 
            key={dn.id}
            id={dn.id}
            value={Math.round(dn.value)}
            isCrit={dn.isCrit}
            xOffset={dn.xOffset}
            yOffset={dn.yOffset}
            targetX={targetX}
            targetY={targetY}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  damageNode: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
