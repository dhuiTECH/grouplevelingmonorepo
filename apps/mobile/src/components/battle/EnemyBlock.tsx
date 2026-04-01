import React, { type RefObject, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, Easing, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';
import { EnemyHPBar } from './EnemyHPBar';
import { COLORS } from './battleTheme';
import { useBattleStore } from '@/store/useBattleStore';
import { PHASE } from '@/store/useBattleStore';

/** Layout reference; icon + spritesheet enemies share the same rendered sprite size. */
const ENEMY_REFERENCE = 260;
const ENEMY_ICON_SIZE = Math.round(ENEMY_REFERENCE * 0.82);
/** Spritesheet mobs (e.g. Shiba) match `icon_url` mobs — same `size` as `enemyImage`. */
const ENEMY_SPRITE_SIZE = ENEMY_ICON_SIZE;
const ENEMY_FIGURE_BOX = Math.round(ENEMY_ICON_SIZE * 1.05);

interface EnemyBlockProps {
  enemyFigureRef: RefObject<View | null>;
  setEnemyFigureCenter: (center: { x: number; y: number }) => void;
  action?: 'idle' | 'walk' | 'enter';
  onEnterComplete?: () => void;
}

export function EnemyBlock({
  enemyFigureRef,
  setEnemyFigureCenter,
  action = 'idle',
  onEnterComplete,
}: EnemyBlockProps) {
  const enemy = useBattleStore(state => state.enemy);
  const currentPhase = useBattleStore(state => state.currentPhase);
  const lastDamageEvent = useBattleStore(state => state.lastDamageEvent);
  
  // Local state for visual HP to allow smooth bars
  const [visualEnemyHp, setVisualEnemyHp] = React.useState(enemy?.hp || 0);

  useEffect(() => {
    if (enemy?.hp !== undefined) {
      setVisualEnemyHp(prev => {
        if (enemy.hp > prev || prev === 0) return enemy.hp;
        return enemy.hp; // Update directly for now, HPBar component handles internal smoothing
      });
    }
  }, [enemy?.hp]);

  // Reanimated values
  const lungeY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Trigger lunge or hit animations based on damage events
  useEffect(() => {
    if (!lastDamageEvent) return;

    // Enemy is attacking
    if (lastDamageEvent.casterCharId === 'ENEMY' || (lastDamageEvent.targetId !== 'ENEMY' && !lastDamageEvent.casterCharId)) {
      lungeY.value = withSequence(
        withTiming(50, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
      );
    }
    // Enemy is hit
    else if (lastDamageEvent.targetId === 'ENEMY') {
      // Small flinch
      lungeY.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    }
  }, [lastDamageEvent?.timestamp]);

  // Scale up during enemy strike phase
  useEffect(() => {
    if (currentPhase === PHASE.ENEMY_STRIKE) {
      scale.value = withSpring(1.1);
    } else {
      scale.value = withSpring(1);
    }
  }, [currentPhase]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lungeY.value },
      { scale: scale.value }
    ]
  }));

  if (!enemy) return null;

  return (
    <View style={styles.enemyBlockWrap}>
      <View style={styles.enemySection}>
        <View style={styles.enemyHeader}>
          <Text style={styles.enemyName}>{enemy?.name || 'MIMIC'}</Text>
          <Text style={styles.enemyLevel}>Lv. {enemy?.level || 45}</Text>
        </View>
        <EnemyHPBar
          hpPercentage={Math.max(0, (visualEnemyHp / (enemy?.maxHP || 1)) * 100)}
          currentHP={visualEnemyHp}
          maxHP={enemy?.maxHP || 1}
        />
      </View>
      <Animated.View
        ref={enemyFigureRef as any} // Reanimated interop
        style={[styles.enemyFigure, animatedStyle]}
        onLayout={() => {
          if (enemyFigureRef.current && (enemyFigureRef.current as any).measureInWindow) {
            (enemyFigureRef.current as any).measureInWindow((x: number, y: number, width: number, height: number) => {
              setEnemyFigureCenter({ x: x + width / 2, y: y + height / 2 });
            });
          }
        }}
      >
        {enemy?.metadata ? (
          <OptimizedPetAvatar
            petDetails={enemy}
            size={ENEMY_SPRITE_SIZE}
            hideBackground
            borderRadius={0}
            action={action}
            onEnterComplete={onEnterComplete}
          />
        ) : enemy?.icon_url ? (
          <Image
            source={{ uri: enemy.icon_url }}
            style={styles.enemyImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={styles.enemyEmoji}>👾</Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  enemyBlockWrap: {
    alignItems: 'center',
    width: '100%',
    marginTop: 36,
    /** Pulls party row slightly closer without crowding */
    marginBottom: -20,
  },
  enemySection: {
    marginTop: 0,
    alignItems: 'center',
    width: '100%',
  },
  enemyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: Dimensions.get('window').width * 0.4,
    paddingHorizontal: 2,
    marginBottom: 0,
  },
  enemyName: {
    color: 'white',
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 9,
  },
  enemyLevel: {
    color: COLORS.neonCyan,
    fontWeight: 'bold',
    fontSize: 9,
  },
  enemyFigure: {
    width: ENEMY_FIGURE_BOX,
    height: ENEMY_FIGURE_BOX,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    /** Pull sprite closer to HP bar after larger avatar size */
    marginTop: -28,
  },
  enemyImage: { width: ENEMY_ICON_SIZE, height: ENEMY_ICON_SIZE },
  enemyEmoji: { fontSize: 88 },
  enemyAttacking: { borderColor: '#ef4444', transform: [{ scale: 1.1 }] },
});
