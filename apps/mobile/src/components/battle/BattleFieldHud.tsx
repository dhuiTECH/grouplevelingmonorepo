import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ACTOR_TYPE } from '@/hooks/useBattleLogic';
import { battleScreenStyles } from '@/components/battle/battleScreenStyles';

const styles = battleScreenStyles;

/** Floats over the gap between enemy and party so chain / turn labels never push avatars down. */
const hudOverlay = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '32%',
    alignItems: 'center',
    zIndex: 8,
    pointerEvents: 'none',
  },
});

interface BattleFieldHudProps {
  chainCount: number;
  isPlayerTurnPhase: boolean;
  activeActorType: string;
  /** Pet name or enemy (mob) name for the current turn actor */
  turnActorDisplayName: string;
}

export function BattleFieldHud({
  chainCount,
  isPlayerTurnPhase,
  activeActorType,
  turnActorDisplayName,
}: BattleFieldHudProps) {
  const showChain = chainCount > 0 && isPlayerTurnPhase;
  const showPet = activeActorType === ACTOR_TYPE.PET;
  const showEnemy = activeActorType === ACTOR_TYPE.ENEMY;
  if (!showChain && !showPet && !showEnemy) return null;

  return (
    <View style={hudOverlay.root}>
      {showChain && (
        <View style={styles.battleHudBare}>
          <Text style={styles.battleHudSystem}>SYSTEM // CHAIN</Text>
          <Text style={styles.battleHudTitle}>
            {chainCount} · CHAIN
          </Text>
          <Text style={styles.battleHudSub}>DMG MOD +{chainCount * 10}%</Text>
        </View>
      )}
      {showPet && (
        <View style={styles.battleHudBare}>
          <Text style={styles.battleHudSystem}>SYSTEM // FAMILIAR</Text>
          <Text style={[styles.battleHudTitle, styles.battleHudTitlePet]}>
            {(turnActorDisplayName || 'Companion').toUpperCase()}
          </Text>
          <Text style={styles.battleHudSub}>Pet strike phase</Text>
        </View>
      )}
      {showEnemy && (
        <View style={styles.battleHudBare}>
          <Text style={styles.battleHudSystem}>SYSTEM // GATE</Text>
          <Text style={[styles.battleHudTitle, styles.battleHudTitleEnemy]}>
            {(turnActorDisplayName || 'Enemy').toUpperCase()}
          </Text>
          <Text style={styles.battleHudSub}>Threat response — brace</Text>
        </View>
      )}
    </View>
  );
}
