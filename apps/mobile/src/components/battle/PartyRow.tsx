import React, { type MutableRefObject } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import LayeredAvatar from '@/components/LayeredAvatar';
import { PetLayeredAvatar } from '@/components/PetLayeredAvatar';
import { StatusBarMetric } from './StatusBarMetric';
import { COLORS } from './battleTheme';

interface PartyRowProps {
  party: any[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  isPlayerTurnPhase: boolean;
  visualPartyHps: Record<string, number>;
  partyLungeAnims: MutableRefObject<Record<string, Animated.Value>>;
  partyOpacity: Animated.Value;
  petSpriteActive: boolean;
  user?: any;
  allShopItems?: any[];
  petAction?: 'idle' | 'walk' | 'enter';
  onPetEnterComplete?: () => void;
}

export function PartyRow({
  party,
  activeIndex,
  setActiveIndex,
  isPlayerTurnPhase,
  visualPartyHps,
  partyLungeAnims,
  partyOpacity,
  petSpriteActive,
  user,
  allShopItems,
  petAction = 'idle',
  onPetEnterComplete,
}: PartyRowProps) {
  return (
    <Animated.View style={[styles.partyContainer, { opacity: partyOpacity }]}>
      {party.map((char: any, index: number) => {
        const isActive = index === activeIndex;
        const isPet = char.type === 'pet';
        const isMe = char.id === user?.id || char.id === `pet-${user?.id}`;
        const lungeAnim = partyLungeAnims.current[char.id] || new Animated.Value(0);
        
        return (
          <Animated.View key={char.id} style={{ transform: [{ translateY: lungeAnim }] }}>
            <TouchableOpacity
              onPress={() => {
                // In co-op, you can only select your own characters if it's the player turn phase
                if (isPlayerTurnPhase && isMe) {
                  setActiveIndex(index);
                }
              }}
              style={[
                styles.charFigure, 
                isActive && styles.charActive,
              ]}
            >
              {isPet && char.petDetails ? (
                <PetLayeredAvatar
                  petDetails={char.petDetails}
                  size={110}
                  square
                  hideBackground
                  // In battle: play the spritesheet ONCE when the pet first enters,
                  // then snap back to the first frame and stay idle/breathing.
                  animate={false}
                  playOnceKey={petAction === 'enter' ? char.id : undefined}
                  breathe={petAction !== 'enter'}
                  onPlayOnceComplete={onPetEnterComplete}
                />
              ) : char.avatar ? (
                <LayeredAvatar
                  user={char.avatar}
                  size={110}
                  square
                  hideBackground
                  allShopItems={allShopItems}
                  style={{ backgroundColor: 'transparent' }}
                />
              ) : (
                <Text style={{ fontSize: 50 }}>🥷</Text>
              )}
              <View style={{ marginTop: 8 }}>
                <StatusBarMetric
                  current={visualPartyHps[char.id] ?? char.hp}
                  max={char.maxHP}
                  color={char.type === 'pet' ? '#a855f7' : COLORS.neonCyan}
                  label={char.name}
                />
              </View>
              {char.atkBuff > 0 && (
                <View style={styles.charBuffBadge}>
                  <ArrowUp size={10} color="#facc15" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  partyContainer: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  charFigure: { alignItems: 'center', opacity: 0.9, transform: [{ scale: 0.9 }] },
  charActive: { opacity: 1, transform: [{ scale: 1.05 }] },
  charBuffBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(250,204,21,0.25)',
    padding: 4,
    borderRadius: 4,
  },
});
