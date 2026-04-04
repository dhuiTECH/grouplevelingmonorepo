import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Settings, LogOut } from 'lucide-react-native';
import LayeredAvatar from '@/components/LayeredAvatar';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';

interface TopHUDProps {
  turnQueue: string[];
  queueIndex: number;
  party: any[];
  enemy: any;
  activeChar: any;
  actorTypeEnemy: string;
  actorTypePet: string;
  /** Required for LayeredAvatar to resolve weapon-matched hand_grip when cosmetics omit the row */
  allShopItems?: any[];
  onSettingsPress: () => void;
  onLeaveBattle: () => void;
}

export const TopHUD = React.memo(function TopHUD({
  turnQueue,
  queueIndex,
  party,
  enemy,
  activeChar,
  actorTypeEnemy,
  actorTypePet,
  allShopItems = [],
  onSettingsPress,
  onLeaveBattle,
}: TopHUDProps) {
  const petInParty = party.find((c: any) => c.type === 'pet');

  return (
    <View style={styles.topHud} pointerEvents="box-none">
      <View style={styles.turnQueue}>
        {turnQueue.slice(queueIndex, queueIndex + 4).map((id: string, i: number) => {
          const isEnemy = id === 'ENEMY';
          const isPet = id.startsWith('pet-');
          const ownerId = isPet ? id.replace('pet-', '') : null;
          const char = party.find(p => p.id === (isPet ? id : id));
          
          const petQueueSize = i === 0 ? 44 : 28;
          return (
            <View
              key={i}
              style={[
                styles.queueItem,
                i === 0 && styles.queueItemActive,
                isEnemy ? { borderColor: '#ef4444' } : isPet ? { borderColor: '#a855f7' } : { borderColor: '#22d3ee' },
              ]}
            >
              {isEnemy ? (
                enemy?.metadata ? (
                  <OptimizedPetAvatar petDetails={enemy} size={i === 0 ? 44 : 28} square hideBackground forceLegacy={true} />
                ) : enemy?.icon_url ? (
                  <Image source={{ uri: enemy.icon_url }} style={styles.queueImage} cachePolicy="memory-disk" />
                ) : (
                  <Text style={{ fontSize: 20 }}>👾</Text>
                )
              ) : isPet && char?.petDetails ? (
                <OptimizedPetAvatar petDetails={char.petDetails} size={petQueueSize} square hideBackground forceLegacy={true} />
              ) : isPet ? (
                <Text style={{ fontSize: 20 }}>🐾</Text>
              ) : char?.avatar ? (
                <View style={styles.queueAvatarWrapper}>
                  <LayeredAvatar
                    user={char.avatar}
                    size={i === 0 ? 44 : 28}
                    square
                    hideBackground
                    allShopItems={allShopItems}
                    style={{ backgroundColor: 'transparent' }}
                  />
                </View>
              ) : (
                <Text style={{ fontSize: 20 }}>🥷</Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.topRightButtons}>
        <TouchableOpacity onPress={onSettingsPress} style={styles.leaveBtn}>
          <Settings size={20} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onLeaveBattle} style={styles.leaveBtn}>
          <LogOut size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 40,
    zIndex: 20,
    position: 'absolute',
    width: '100%',
    top: 0,
  },
  turnQueue: { gap: 8 },
  queueItem: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    transform: [{ skewX: '-12deg' }],
    overflow: 'hidden',
  },
  queueItemActive: { width: 48, height: 48, borderColor: '#22d3ee', borderWidth: 2 },
  queueImage: { width: '100%', height: '100%', borderRadius: 4 },
  queueAvatarWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightButtons: { flexDirection: 'row', gap: 8 },
  leaveBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
});
