import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sword, RotateCcw } from 'lucide-react-native';
import { Hexagon } from './Hexagon';
import { BattleTechButton } from './BattleTechButton';
import { BattleCard } from './BattleCard';
import { COLORS, HUD } from './battleTheme';
import { ACTOR_TYPE } from '@/hooks/useBattleLogic';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BattleBottomPanelProps {
  partyOpacity: Animated.Value;
  isPlayerTurnPhase: boolean;
  activeChar: any;
  plannedAbilities: any[];
  processPlannedActions: () => void;
  stance: { label: string };
  switchStance: () => void;
  undoLastAction: () => void;
  skipTurn: () => void;
  handleInventoryPress: () => void;
  selectedAbilityId: string | null;
  handleAbilityTap: (ability: any) => void;
  activeActorType?: string;
  activeActorName?: string;
  /** Pet or enemy name for non-player turns (from turn queue) */
  turnActorDisplayName?: string;
}

export function BattleBottomPanel({
  partyOpacity,
  isPlayerTurnPhase,
  activeChar,
  plannedAbilities,
  processPlannedActions,
  stance,
  switchStance,
  undoLastAction,
  skipTurn,
  handleInventoryPress,
  selectedAbilityId,
  handleAbilityTap,
  activeActorType,
  activeActorName,
  turnActorDisplayName = '',
}: BattleBottomPanelProps) {
  return (
    <Animated.View style={[styles.panelContainer, { opacity: partyOpacity }]}>
      <View style={styles.panelBackground} />
      {isPlayerTurnPhase && activeChar && (
        <View style={styles.apHeader}>
          <Text style={styles.apLabel}>ACTION POINTS</Text>
          <View style={styles.apPips}>
            {[...Array(activeChar.maxAP)].map((_, i) => (
              <View key={i} style={styles.rotatedHex}>
                <Hexagon size={14} color={i < activeChar.ap ? COLORS.neonCyan : '#475569'} fill />
              </View>
            ))}
            <Text style={styles.apText}>{activeChar.ap} / {activeChar.maxAP}</Text>
          </View>
        </View>
      )}
      <TouchableOpacity
        style={[styles.battleBtn, plannedAbilities.length === 0 && { opacity: 0.5 }]}
        activeOpacity={0.9}
        onPress={processPlannedActions}
        disabled={!isPlayerTurnPhase || plannedAbilities.length === 0}
      >
        <LinearGradient
          colors={['rgba(22, 78, 99, 0.8)', 'rgba(8, 145, 178, 0.9)', 'rgba(22, 78, 99, 0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.battleBtnGradient}
        >
          <View style={styles.battleBtnShine} />
          <View style={[styles.battleBtnInnerBorder, { borderColor: 'rgba(34, 211, 238, 0.5)', shadowColor: '#22d3ee', shadowOpacity: 0.8, shadowRadius: 5 }]} />
          <Text style={[styles.battleBtnText, { textShadowColor: '#22d3ee', textShadowRadius: 8 }]}>EXECUTE CHAIN</Text>
        </LinearGradient>
      </TouchableOpacity>
      <View style={styles.actionsGrid}>
        <BattleTechButton
          icon={Sword}
          label={stance.label}
          color={COLORS.neonOrange}
          neonColor={COLORS.neonOrange}
          onPress={switchStance}
          disabled={!isPlayerTurnPhase}
        />
        <BattleTechButton
          icon={RotateCcw}
          label="UNDO"
          color={COLORS.neonYellow}
          neonColor={COLORS.neonYellow}
          onPress={undoLastAction}
          disabled={!isPlayerTurnPhase}
        />
        <BattleTechButton label="SKIP" color="#94a3b8" neonColor="#94a3b8" onPress={skipTurn} disabled={!isPlayerTurnPhase} />
        <BattleTechButton label="INVENTORY" color={COLORS.neonGreen} neonColor={COLORS.neonGreen} onPress={handleInventoryPress} />
      </View>
      <View style={styles.cardsRow}>
        {isPlayerTurnPhase && activeChar ? (
          <View style={styles.cardsContainer}>
            {activeChar.abilities.slice(0, 4).map((ability: any, index: number) => {
              const canAfford = activeChar.ap >= ability.cost && activeChar.hp > 0;
              const isSelected = selectedAbilityId === ability.id;
              return (
                <View
                  key={ability.id}
                  style={[styles.cardWrapper, index < activeChar.abilities.length - 1 && { marginRight: 8 }]}
                >
                  <BattleCard
                    title={ability.name}
                    cost={ability.cost}
                    isSelected={isSelected}
                    canAfford={canAfford}
                    onPress={() => handleAbilityTap(ability)}
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.waitingContainer}>
            <View style={styles.hudPanelBare}>
              <Text style={styles.hudSystemTag}>
                {activeActorType === ACTOR_TYPE.ENEMY
                  ? 'SYSTEM // GATE'
                  : activeActorType === ACTOR_TYPE.PET
                    ? 'SYSTEM // FAMILIAR'
                    : 'SYSTEM // SYNC'}
              </Text>
              <Text
                style={[
                  styles.hudPhaseTitle,
                  activeActorType === ACTOR_TYPE.ENEMY && { color: HUD.enemyCrimson },
                  activeActorType === ACTOR_TYPE.PET && { color: HUD.petViolet },
                  activeActorType !== ACTOR_TYPE.ENEMY &&
                    activeActorType !== ACTOR_TYPE.PET && { color: HUD.hunterCyan },
                ]}
              >
                {activeActorType === ACTOR_TYPE.ENEMY
                  ? (turnActorDisplayName || 'Enemy').toUpperCase()
                  : activeActorType === ACTOR_TYPE.PET
                    ? (turnActorDisplayName || 'Companion').toUpperCase()
                    : `AWAITING ${activeActorName?.toUpperCase() || 'HUNTER'}`}
              </Text>
              <Text style={styles.hudPhaseSub}>
                {activeActorType === ACTOR_TYPE.ENEMY
                  ? 'Hostile action — stand by'
                  : activeActorType === ACTOR_TYPE.PET
                    ? 'Autonomous strike sequence'
                    : 'Party member turn'}
              </Text>
            </View>
            <View style={styles.waitingBar}>
              <LinearGradient
                colors={
                  activeActorType === ACTOR_TYPE.ENEMY
                    ? [HUD.enemyCrimson, 'transparent']
                    : activeActorType === ACTOR_TYPE.PET
                      ? ['#a78bfa', 'transparent']
                      : [COLORS.neonCyan, 'transparent']
                }
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.waitingProgress}
              />
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panelContainer: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(34, 211, 238, 0.3)',
    paddingBottom: 12,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  panelBackground: {},
  apHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  apLabel: {
    color: COLORS.neonCyan,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  apPips: { flexDirection: 'row', alignItems: 'center' },
  rotatedHex: { transform: [{ rotate: '90deg' }], marginHorizontal: 1 },
  apText: {
    color: 'white',
    fontFamily: 'Exo2-Regular',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  battleBtn: {
    height: 40,
    marginBottom: 8,
    borderRadius: 20,
    shadowColor: COLORS.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  battleBtnGradient: {
    flex: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neonCyan,
    overflow: 'hidden',
  },
  battleBtnShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  battleBtnInnerBorder: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    right: 3,
    borderWidth: 1,
    borderRadius: 22,
  },
  battleBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  cardsRow: {
    height: 70,
    marginTop: 0,
    width: '100%',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cardWrapper: {
    flex: 1,
    maxWidth: (SCREEN_WIDTH - 32 - 24) / 4,
    height: '100%',
  },
  waitingContainer: {
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudPanelBare: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 32,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  hudSystemTag: {
    color: HUD.systemLabel,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'Exo2-Regular',
    marginBottom: 4,
  },
  hudPhaseTitle: {
    color: HUD.hunterCyan,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: 'Exo2-Regular',
  },
  hudPhaseSub: {
    color: 'rgba(148, 163, 184, 0.95)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
    fontFamily: 'Exo2-Regular',
  },
  waitingBar: {
    width: '60%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 8,
    borderRadius: 1,
    overflow: 'hidden',
  },
  waitingProgress: {
    width: '100%',
    height: '100%',
  },
});
