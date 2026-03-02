import React, { type RefObject } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';
import { EnemyHPBar } from './EnemyHPBar';
import { COLORS } from './battleTheme';

interface EnemyBlockProps {
  enemy: any;
  visualEnemyHp: number;
  currentPhase: string;
  phaseEnemyStrike: string;
  enemyLungeAnim: Animated.Value;
  enemyFigureRef: RefObject<View | null>;
  setEnemyFigureCenter: (center: { x: number; y: number }) => void;
  enemySpriteActive: boolean;
  action?: 'idle' | 'walk' | 'enter';
  onEnterComplete?: () => void;
}

export function EnemyBlock({
  enemy,
  visualEnemyHp,
  currentPhase,
  phaseEnemyStrike,
  enemyLungeAnim,
  enemyFigureRef,
  setEnemyFigureCenter,
  enemySpriteActive,
  action = 'idle',
  onEnterComplete,
}: EnemyBlockProps) {
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
        ref={enemyFigureRef}
        style={[
          styles.enemyFigure,
          currentPhase === phaseEnemyStrike && styles.enemyAttacking,
          { transform: [{ translateY: enemyLungeAnim }] },
        ]}
        onLayout={() => {
          enemyFigureRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
            setEnemyFigureCenter({ x: x + width / 2, y: y + height / 2 });
          });
        }}
      >
        {enemy?.metadata ? (
          <OptimizedPetAvatar
            petDetails={enemy}
            size={140}
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
    marginTop: 20,
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
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginTop: 2,
  },
  enemyImage: { width: 110, height: 110 },
  enemyEmoji: { fontSize: 50 },
  enemyAttacking: { borderColor: '#ef4444', transform: [{ scale: 1.1 }] },
});
