import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
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
  partyOpacity: any; // React Native Animated value passed from parent for transition
  petSpriteActive: boolean;
  user?: any;
  allShopItems?: any[];
  petAction?: 'idle' | 'walk' | 'enter';
  onPetEnterComplete?: () => void;
  lastDamageEvent?: any;
  weaponGripCast?: { key: number; durationMs: number; casterCharId: string } | null;
}

function PartyMemberNode({
  char,
  isActive,
  isPlayerTurnPhase,
  isMe,
  setActiveIndex,
  visualHp,
  allShopItems,
  petAction,
  petSpriteActive,
  onPetEnterComplete,
  lastDamageEvent,
  weaponGripCast,
}: any) {
  const isPet = char.type === 'pet';
  const lungeY = useSharedValue(0);
  const exitY = useSharedValue(0);
  const exitOpacity = useSharedValue(1);

  const hp = visualHp ?? char.hp ?? 0;
  const [leftBattle, setLeftBattle] = useState(() => hp <= 0);
  const deathExitStartedRef = useRef(false);

  useEffect(() => {
    if (hp > 0) {
      deathExitStartedRef.current = false;
      exitY.value = 0;
      exitOpacity.value = 1;
      setLeftBattle(false);
      return;
    }
    if (leftBattle) return;
    if (deathExitStartedRef.current) return;
    deathExitStartedRef.current = true;
    exitY.value = withTiming(160, { duration: 480, easing: Easing.in(Easing.cubic) });
    exitOpacity.value = withTiming(0, { duration: 480 });
    const t = setTimeout(() => setLeftBattle(true), 500);
    return () => clearTimeout(t);
  }, [hp, leftBattle]);

  useEffect(() => {
    if (!lastDamageEvent || hp <= 0) return;

    // Character attacks (lunge up)
    if (lastDamageEvent.casterCharId === char.id) {
      lungeY.value = withSequence(
        withTiming(-50, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
      );
    }
    // Character takes damage (flinch down)
    else if (lastDamageEvent.targetId === char.id || lastDamageEvent.targetId === 'ALL_FRIENDS') {
      lungeY.value = withSequence(
        withTiming(15, { duration: 100 }),
        withTiming(0, { duration: 150 })
      );
    }
  }, [lastDamageEvent?.timestamp, hp]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
    transform: [{ translateY: lungeY.value + exitY.value }],
  }));

  if (leftBattle) {
    return null;
  }

  return (
    <Animated.View style={[animatedStyle, styles.partyMemberOuter]}>
      <TouchableOpacity
        onPress={() => {
          if (isPlayerTurnPhase && isMe) {
            setActiveIndex();
          }
        }}
        disabled={hp <= 0}
        style={[styles.charFigure, isActive && styles.charActive]}
        activeOpacity={0.9}
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
          <View style={styles.avatarSwingSlot} pointerEvents="box-none">
            <LayeredAvatar
              user={char.avatar}
              size={110}
              square
              hideBackground
              allowOverflow
              allShopItems={allShopItems}
              style={{ backgroundColor: 'transparent' }}
              weaponGripAttackKey={
                weaponGripCast?.casterCharId === char.id ? weaponGripCast.key : undefined
              }
              weaponGripAttackDurationMs={
                weaponGripCast?.casterCharId === char.id ? weaponGripCast.durationMs : undefined
              }
            />
          </View>
        ) : (
          <Text style={{ fontSize: 50 }}>🥷</Text>
        )}
        <View style={{ marginTop: 8 }}>
          <StatusBarMetric
            current={hp}
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
  weaponGripCast,
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
            weaponGripCast={weaponGripCast}
          />
        );
      })}
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  partyContainer: { flexDirection: 'row', gap: 20, marginBottom: 20, overflow: 'visible' },
  partyMemberOuter: { overflow: 'visible' },
  /** Extra vertical room so weapon/hand swings are not clipped by row layout */
  avatarSwingSlot: {
    overflow: 'visible',
    paddingTop: 28,
    paddingBottom: 8,
    marginTop: -28,
    marginBottom: -8,
    alignItems: 'center',
  },
  charFigure: {
    alignItems: 'center',
    opacity: 0.9,
    transform: [{ scale: 0.9 }],
    overflow: 'visible',
  },
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
