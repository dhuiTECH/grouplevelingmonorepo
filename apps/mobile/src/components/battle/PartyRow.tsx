import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { ArrowUp } from 'lucide-react-native';
import LayeredAvatar from '@/components/LayeredAvatar';
import { PetLayeredAvatar } from '@/components/PetLayeredAvatar';
import { StatusBarMetric } from './StatusBarMetric';
import { COLORS } from './battleTheme';
import { useBattleStore } from '@/store/useBattleStore';

interface PartyRowProps {
  party: any[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  isPlayerTurnPhase: boolean;
  visualPartyHps: Record<string, number>;
  partyOpacity: any; // React Native Animated value passed from parent for transition
  petSpriteActive: boolean;
  user?: any;
  allShopItems?: any[];
  petAction?: 'idle' | 'walk' | 'enter';
  onPetEnterComplete?: () => void;
  lastDamageEvent?: any;
}

function PartyMemberNode({ char, isActive, isPlayerTurnPhase, isMe, setActiveIndex, visualHp, allShopItems, petAction, petSpriteActive, onPetEnterComplete, lastDamageEvent }: any) {
  const isPet = char.type === 'pet';
  const lungeY = useSharedValue(0);

  useEffect(() => {
    if (!lastDamageEvent) return;
    
    // Character attacks (lunge up)
    if (lastDamageEvent.casterCharId === char.id) {
      lungeY.value = withSequence(
        withTiming(-50, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
      );
    }
    // Character takes damage (flinch down)
    else if (lastDamageEvent.targetId === char.id || (lastDamageEvent.targetId === 'ALL_FRIENDS')) {
      lungeY.value = withSequence(
        withTiming(15, { duration: 100 }),
        withTiming(0, { duration: 150 })
      );
    }
  }, [lastDamageEvent?.timestamp]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lungeY.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={() => {
          if (isPlayerTurnPhase && isMe) {
            setActiveIndex();
          }
        }}
        style={[styles.charFigure, isActive && styles.charActive]}
      >
        {isPet && char.petDetails ? (
          <PetLayeredAvatar
            petDetails={char.petDetails}
            size={110}
            square
            hideBackground
            animate={false}
            playOnceKey={(petAction === 'enter' || (lastDamageEvent?.casterCharId === char.id)) ? `${char.id}-${petAction}-${lastDamageEvent?.timestamp || 0}` : undefined}
            breathe={!petSpriteActive && petAction !== 'enter'}
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
            current={visualHp ?? char.hp}
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
}

export function PartyRow({
  party,
  activeIndex,
  setActiveIndex,
  isPlayerTurnPhase,
  visualPartyHps,
  partyOpacity, // Kept to avoid breaking parent Animated.timing fade-in for now
  petSpriteActive,
  user,
  allShopItems,
  petAction = 'idle',
  onPetEnterComplete,
  lastDamageEvent,
}: PartyRowProps) {
  // Use Animated.View for backward compatibility with the parent's partyOpacity Animated.Value
  const RNAnimated = require('react-native').Animated;
  return (
    <RNAnimated.View style={[styles.partyContainer, { opacity: partyOpacity }]}>
      {party.map((char: any, index: number) => {
        const isActive = index === activeIndex;
        const isMe = char.id === user?.id || char.id === `pet-${user?.id}`;
        
        return (
          <PartyMemberNode 
            key={char.id}
            char={char}
            isActive={isActive}
            isPlayerTurnPhase={isPlayerTurnPhase}
            isMe={isMe}
            setActiveIndex={() => setActiveIndex(index)}
            visualHp={visualPartyHps[char.id]}
            allShopItems={allShopItems}
            petAction={petAction}
            petSpriteActive={petSpriteActive}
            onPetEnterComplete={onPetEnterComplete}
            lastDamageEvent={lastDamageEvent}
          />
        );
      })}
    </RNAnimated.View>
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
