import React from 'react';
import { View, Text } from 'react-native';
import { ACTOR_TYPE } from '@/hooks/useBattleLogic';
import { battleScreenStyles } from '@/components/battle/battleScreenStyles';

const styles = battleScreenStyles;

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
  return (
    <>
      {chainCount > 0 && isPlayerTurnPhase && (
        <View style={styles.battleHudBare}>
          <Text style={styles.battleHudSystem}>SYSTEM // CHAIN</Text>
          <Text style={styles.battleHudTitle}>
            {chainCount} · CHAIN
          </Text>
          <Text style={styles.battleHudSub}>DMG MOD +{chainCount * 10}%</Text>
        </View>
      )}
      {activeActorType === ACTOR_TYPE.PET && (
        <View style={styles.battleHudBare}>
          <Text style={styles.battleHudSystem}>SYSTEM // FAMILIAR</Text>
          <Text style={[styles.battleHudTitle, styles.battleHudTitlePet]}>
            {(turnActorDisplayName || 'Companion').toUpperCase()}
          </Text>
          <Text style={styles.battleHudSub}>Pet strike phase</Text>
        </View>
      )}
      {activeActorType === ACTOR_TYPE.ENEMY && (
        <View style={styles.battleHudBare}>
          <Text style={styles.battleHudSystem}>SYSTEM // GATE</Text>
          <Text style={[styles.battleHudTitle, styles.battleHudTitleEnemy]}>
            {(turnActorDisplayName || 'Enemy').toUpperCase()}
          </Text>
          <Text style={styles.battleHudSub}>Threat response — brace</Text>
        </View>
      )}
    </>
  );
}
