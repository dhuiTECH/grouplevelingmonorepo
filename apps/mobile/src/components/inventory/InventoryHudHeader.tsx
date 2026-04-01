import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import type { User } from '@/types/user';
import { calculateCombatPower } from '@/utils/stats';
import { RANK_COLORS } from '@/constants/gameConstants';
import { inventoryScreenStyles as styles } from '@/screens/InventoryScreen.styles';

interface InventoryHudHeaderProps {
  user: User;
  level: number;
  playerRank: string;
  onOpenStatus: () => void;
}

export function InventoryHudHeader({ user, level, playerRank, onOpenStatus }: InventoryHudHeaderProps) {
  return (
    <View style={styles.hudHeader}>
      <View style={styles.hudLeft}>
        <Text style={styles.hudName}>{user.name || 'UNKNOWN'}</Text>
        <View style={styles.hudStatsRow}>
          <Text style={styles.hudStatText}>
            LV. <Text style={styles.hudLevelValue}>{level}</Text>
          </Text>
          <Text style={styles.hudStatText}>
            CP <Text style={styles.hudCPValue}>{calculateCombatPower(user).toLocaleString()}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.hudCenter}>
        <View style={styles.headerCurrencyContainer}>
          <TouchableOpacity onPress={onOpenStatus} style={styles.statsBtn}>
            <Image source={require('../../../assets/stats.png')} style={styles.statsIcon} contentFit="contain" />
          </TouchableOpacity>

          <View style={styles.currencyPillYellow}>
            <Image source={require('../../../assets/coinicon.png')} style={styles.currencyIcon} contentFit="contain" />
            <Text style={styles.currencyTextYellow}>{(user.coins || 0).toLocaleString()}</Text>
          </View>

          <View style={styles.currencyPillPurple}>
            <Image source={require('../../../assets/gemicon.png')} style={styles.currencyIcon} contentFit="contain" />
            <Text style={styles.currencyTextPurple}>{(user.gems || 0).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.hudRight}>
        <Text style={styles.hudLabel}>RANK</Text>
        <Text style={[styles.hudValue, styles.rankValue, { color: RANK_COLORS[playerRank] || '#fff' }]}>
          {playerRank}
        </Text>
      </View>
    </View>
  );
}
