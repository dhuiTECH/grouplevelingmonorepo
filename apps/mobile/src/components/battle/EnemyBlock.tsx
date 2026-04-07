import React, { type RefObject, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BattleEnemyAvatar } from './BattleEnemyAvatar';
import { EnemyHPBar } from './EnemyHPBar';
import { COLORS } from './battleTheme';
import { useBattleStore } from '@/store/useBattleStore';
import { BattleDeathDisintegrate } from './BattleDeathDisintegrate';

/** Layout reference; used as min slot size and for icon_url-only enemies. */
const ENEMY_REFERENCE = 290;
const ENEMY_ICON_SIZE = Math.round(ENEMY_REFERENCE * 0.82);
/**
 * Metadata-driven enemies use `pixelSizeMode="oneToOne"` (source pixels = layout points).
 * icon_url-only enemies use ENEMY_IMAGE_SIZE with contain fit.
 */
const ENEMY_SPRITE_SIZE = ENEMY_ICON_SIZE;
const ENEMY_IMAGE_SIZE = Math.round(ENEMY_ICON_SIZE * 0.8);
const ENEMY_FIGURE_BOX = Math.round(ENEMY_ICON_SIZE * 1.05);

interface EnemyBlockProps {
  enemyFigureRef: RefObject<View | null>;
  setEnemyFigureCenter: (center: { x: number; y: number }) => void;
  action?: 'idle' | 'walk' | 'enter';
  onEnterComplete?: () => void;
  /** Pixel dissolve on enemy sprite before victory */
  deathOutro?: boolean;
}

export const EnemyBlock = React.memo(function EnemyBlock({
  enemyFigureRef,
  setEnemyFigureCenter,
  action = 'idle',
  onEnterComplete,
  deathOutro = false,
}: EnemyBlockProps) {
  const enemy = useBattleStore(state => state.enemy);
  const lastDamageEvent = useBattleStore(state => state.lastDamageEvent);
  const enemyCaptureRef = useRef<View>(null);
  const [captureSize, setCaptureSize] = useState({ width: ENEMY_FIGURE_BOX, height: ENEMY_FIGURE_BOX });
  const [hideFigureForDissolve, setHideFigureForDissolve] = useState(false);

  useEffect(() => {
    if (!deathOutro) setHideFigureForDissolve(false);
  }, [deathOutro]);
  
  // Local state for visual HP to allow smooth bars
  const [visualEnemyHp, setVisualEnemyHp] = React.useState(enemy?.hp || 0);

  useEffect(() => {
    if (enemy?.hp !== undefined) {
      setVisualEnemyHp((prev: number) => {
        if (enemy.hp > prev || prev === 0) return enemy.hp;
        return enemy.hp; // Update directly for now, HPBar component handles internal smoothing
      });
    }
  }, [enemy?.hp]);

  const lungeY = useSharedValue(0);

  useEffect(() => {
    if (!lastDamageEvent) return;

    if (lastDamageEvent.casterCharId === 'ENEMY' || (lastDamageEvent.targetId !== 'ENEMY' && !lastDamageEvent.casterCharId)) {
      lungeY.value = withSequence(
        withTiming(50, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
      );
    }
    else if (lastDamageEvent.targetId === 'ENEMY') {
      lungeY.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    }
  }, [lastDamageEvent?.timestamp]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lungeY.value },
    ]
  }));

  if (!enemy) return null;

  return (
    <View style={styles.enemyBlockWrap}>
      <View style={styles.enemySection}>
        <View style={styles.enemyHeader}>
          <Text style={styles.enemyName}>{enemy?.name || 'MIMIC'}</Text>
          <Text style={styles.enemyLevel}>Lv. {enemy?.level ?? 1}</Text>
        </View>
        <EnemyHPBar
          hpPercentage={Math.max(0, (visualEnemyHp / (enemy?.maxHP || 1)) * 100)}
          currentHP={visualEnemyHp}
          maxHP={enemy?.maxHP || 1}
        />
      </View>
      <View style={styles.enemyFigureCaptureOuter}>
        <View
          ref={enemyCaptureRef}
          collapsable={false}
          style={styles.enemyCaptureOnly}
          onLayout={(e: LayoutChangeEvent) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) setCaptureSize({ width, height });
          }}
        >
          <Animated.View
            ref={enemyFigureRef as any} // Reanimated interop
            style={[
              styles.enemyFigure,
              animatedStyle,
              { opacity: hideFigureForDissolve ? 0 : 1 },
            ]}
            onLayout={() => {
              if (enemyFigureRef.current && (enemyFigureRef.current as any).measureInWindow) {
                (enemyFigureRef.current as any).measureInWindow((x: number, y: number, width: number, height: number) => {
                  setEnemyFigureCenter({ x: x + width / 2, y: y + height / 2 });
                });
              }
            }}
          >
            {enemy?.metadata ? (
              <BattleEnemyAvatar
                petDetails={enemy}
                size={ENEMY_SPRITE_SIZE}
                pixelSizeMode="oneToOne"
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
        {deathOutro ? (
          <BattleDeathDisintegrate
            active={deathOutro}
            captureRef={enemyCaptureRef}
            width={captureSize.width}
            height={captureSize.height}
            onCaptureReady={() => setHideFigureForDissolve(true)}
          />
        ) : null}
      </View>
    </View>
  );
});

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
  enemyFigureCaptureOuter: {
    marginTop: -28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: ENEMY_FIGURE_BOX,
    minHeight: ENEMY_FIGURE_BOX,
  },
  enemyCaptureOnly: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  enemyFigure: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  enemyImage: { width: ENEMY_IMAGE_SIZE, height: ENEMY_IMAGE_SIZE },
  enemyEmoji: { fontSize: 88 },
});
