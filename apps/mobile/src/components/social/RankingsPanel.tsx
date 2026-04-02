import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { RefreshCw, Trophy } from 'lucide-react-native';
import { MotiView } from 'moti';
import LayeredAvatar from '@/components/LayeredAvatar';
import { RANK_COLORS } from '@/constants/gameConstants';
import { User } from '@/types/user';
import { calculateCombatPower, getRank } from '@/utils/stats';
import { useGameData } from '@/hooks/useGameData';

interface RankingsPanelProps {
  leaderboard: any[];
  loadLeaderboard: () => void;
  setSelectedAvatar: (user: any) => void;
  isSocialLoading: boolean;
  onRefresh: () => void;
}

const RankingsPanel: React.FC<RankingsPanelProps> = ({
  leaderboard,
  loadLeaderboard,
  setSelectedAvatar,
  isSocialLoading,
  onRefresh
}) => {
  const { shopItems } = useGameData();

  const getRankingClass = (index: number) => {
    if (index === 0) return styles.rankingGold;
    if (index === 1) return styles.rankingSilver;
    if (index === 2) return styles.rankingBronze;
    return {};
  };

  const getRankNumberColor = (index: number) => {
    if (index === 0) return '#fbbf24'; // Gold
    if (index === 1) return '#22d3ee'; // Cyan
    if (index === 2) return '#3b82f6'; // Blue
    return '#6b7280'; // Gray
  };

  const renderPlayer = ({ item, index }: { item: any, index: number }) => {
    // Construct user object for LayeredAvatar
    const playerUser = {
      ...item,
      name: item.hunter_name || 'Unknown',
      cosmetics: item.cosmetics || []
    };

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 100 }}
        style={[styles.playerCard, getRankingClass(index)]}
      >
        <View style={styles.playerLeft}>
          <Text style={[styles.rankNumber, { color: getRankNumberColor(index) }]}>
            0{index + 1}
          </Text>
          <View style={styles.avatarWrapper}>
            <LayeredAvatar 
              user={playerUser} 
              size={56} 
              onAvatarClick={() => setSelectedAvatar(playerUser)}
              allShopItems={shopItems}
            />
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{playerUser.name}</Text>
            <Text style={styles.playerSubtitle}>
              {item.current_title || 'Hunter'} •{' '}
              <Text style={{ color: RANK_COLORS[getRank(item.level ?? 1)] ?? '#94a3b8', fontWeight: '900' }}>
                {getRank(item.level ?? 1)}-RANK
              </Text>
            </Text>
          </View>
        </View>
        <View style={styles.playerRight}>
          <Text style={styles.cpLabel}>COMBAT POWER</Text>
          <Text style={styles.cpValue}>{calculateCombatPower(item)}</Text>
        </View>
      </MotiView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ELITE HUNTER RANKINGS</Text>
        <TouchableOpacity onPress={loadLeaderboard} style={styles.refreshButton}>
          <RefreshCw size={16} color="#fbbf24" />
        </TouchableOpacity>
      </View>

      {leaderboard.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Trophy size={48} color="rgba(34, 211, 238, 0.3)" />
          <Text style={styles.emptyTitle}>NO RANKINGS YET</Text>
          <Text style={styles.emptySubtitle}>Be the first to join the leaderboard!</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          getItemLayout={(_data, index) => ({ length: 88, offset: 88 * index, index })}
          refreshControl={
            <RefreshControl 
              refreshing={isSocialLoading} 
              onRefresh={onRefresh} 
              tintColor="#22d3ee"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#22d3ee',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  playerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '900',
    fontStyle: 'italic',
    width: 24,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
  },
  playerInfo: {
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#22d3ee',
  },
  playerSubtitle: {
    fontSize: 8,
    color: 'rgba(34, 211, 238, 0.6)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  playerRight: {
    alignItems: 'flex-end',
  },
  cpLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: 'rgba(34, 211, 238, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cpValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3b82f6',
  },
  rankingGold: {
    borderColor: 'rgba(251, 191, 36, 0.3)',
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
  },
  rankingSilver: {
    borderColor: 'rgba(34, 211, 238, 0.3)',
    backgroundColor: 'rgba(34, 211, 238, 0.05)',
  },
  rankingBronze: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#22d3ee',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 10,
    color: 'rgba(34, 211, 238, 0.6)',
    marginTop: 4,
  },
});

export default RankingsPanel;
